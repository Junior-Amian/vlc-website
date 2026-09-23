<?php

declare(strict_types=1);

namespace App\Core;

use PDO;

/**
 * Modèle de base : requêtes préparées sur une table.
 *
 * Volontairement simple — il ne s'agit pas d'un ORM. Les noms de colonnes
 * utilisés dans insert()/update() sont filtrés par $fillable afin qu'une
 * charge utile JSON ne puisse jamais écrire une colonne non prévue.
 */
abstract class Model
{
    protected string $table = '';

    /** @var string[] Colonnes que l'utilisateur est autorisé à renseigner. */
    protected array $fillable = [];

    protected string $primaryKey = 'id';

    protected function db(): PDO
    {
        return Database::connection();
    }

    /** @param array<string, mixed> $attributes */
    public function create(array $attributes): int
    {
        $attributes = $this->filterFillable($attributes);

        if ($attributes === []) {
            return 0;
        }

        $columns = array_keys($attributes);
        $placeholders = array_map(static fn (string $c): string => ':' . $c, $columns);

        $sql = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (%s)',
            $this->table,
            implode('`, `', $columns),
            implode(', ', $placeholders)
        );

        $statement = $this->db()->prepare($sql);
        $statement->execute($attributes);

        return (int) $this->db()->lastInsertId();
    }

    /** @param array<string, mixed> $attributes */
    public function update(int $id, array $attributes): bool
    {
        $attributes = $this->filterFillable($attributes);

        if ($attributes === []) {
            return false;
        }

        $assignments = implode(
            ', ',
            array_map(static fn (string $c): string => "`{$c}` = :{$c}", array_keys($attributes))
        );

        $sql = sprintf(
            'UPDATE `%s` SET %s WHERE `%s` = :__id',
            $this->table,
            $assignments,
            $this->primaryKey
        );

        $statement = $this->db()->prepare($sql);

        return $statement->execute([...$attributes, '__id' => $id]);
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $statement = $this->db()->prepare(
            sprintf('SELECT * FROM `%s` WHERE `%s` = :id LIMIT 1', $this->table, $this->primaryKey)
        );
        $statement->execute(['id' => $id]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<string, mixed>|null */
    public function findBy(string $column, mixed $value): ?array
    {
        $this->guardColumn($column);

        $statement = $this->db()->prepare(
            sprintf('SELECT * FROM `%s` WHERE `%s` = :value LIMIT 1', $this->table, $column)
        );
        $statement->execute(['value' => $value]);

        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /** @return array<int, array<string, mixed>> */
    public function all(string $orderBy = 'id', string $direction = 'DESC', int $limit = 100, int $offset = 0): array
    {
        $this->guardColumn($orderBy);
        $direction = strtoupper($direction) === 'ASC' ? 'ASC' : 'DESC';

        $sql = sprintf(
            'SELECT * FROM `%s` ORDER BY `%s` %s LIMIT :limit OFFSET :offset',
            $this->table,
            $orderBy,
            $direction
        );

        $statement = $this->db()->prepare($sql);
        $statement->bindValue('limit', max(1, min($limit, 500)), PDO::PARAM_INT);
        $statement->bindValue('offset', max(0, $offset), PDO::PARAM_INT);
        $statement->execute();

        return $statement->fetchAll();
    }

    public function delete(int $id): bool
    {
        $statement = $this->db()->prepare(
            sprintf('DELETE FROM `%s` WHERE `%s` = :id', $this->table, $this->primaryKey)
        );

        return $statement->execute(['id' => $id]);
    }

    public function count(): int
    {
        return (int) $this->db()->query(sprintf('SELECT COUNT(*) FROM `%s`', $this->table))->fetchColumn();
    }

    /**
     * @param array<string, mixed> $attributes
     * @return array<string, mixed>
     */
    private function filterFillable(array $attributes): array
    {
        return array_intersect_key($attributes, array_flip($this->fillable));
    }

    /**
     * Un nom de colonne ne peut pas être passé en paramètre lié : on le
     * vérifie contre la liste blanche avant de l'interpoler.
     */
    private function guardColumn(string $column): void
    {
        $allowed = [...$this->fillable, $this->primaryKey, 'created_at', 'updated_at'];

        if (!in_array($column, $allowed, true)) {
            throw new \InvalidArgumentException("Colonne non autorisée : {$column}");
        }
    }
}
