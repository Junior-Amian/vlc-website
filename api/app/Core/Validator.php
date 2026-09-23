<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Validateur par règles, façon « required|email|max:180 ».
 *
 * Règles disponibles : required, string, email, numeric, integer, boolean,
 * min:n, max:n, in:a,b,c, regex:#...#, accepted, date, confirmed.
 */
final class Validator
{
    /** @var array<string, string[]> */
    private array $errors = [];

    /** @var array<string, mixed> */
    private array $validated = [];

    /**
     * @param array<string, mixed>  $data
     * @param array<string, string> $rules
     * @param array<string, string> $labels Libellés lisibles des champs, repris dans les messages.
     */
    public function __construct(
        private readonly array $data,
        private readonly array $rules,
        private readonly array $labels = [],
    ) {
        $this->run();
    }

    private function run(): void
    {
        foreach ($this->rules as $field => $ruleString) {
            $rules = explode('|', $ruleString);
            $value = $this->data[$field] ?? null;

            if (is_string($value)) {
                $value = trim($value);
            }

            $isRequired = in_array('required', $rules, true);
            $isEmpty = $value === null || $value === '';

            if ($isRequired && $isEmpty) {
                $this->addError($field, 'Le champ %s est obligatoire.');
                continue;
            }

            // Un champ facultatif et vide n'est pas validé plus avant, mais
            // il est conservé à null pour que le modèle sache quoi écrire.
            if ($isEmpty) {
                $this->validated[$field] = null;
                continue;
            }

            foreach ($rules as $rule) {
                $this->apply($field, $value, $rule);
            }

            if (!isset($this->errors[$field])) {
                $this->validated[$field] = $value;
            }
        }
    }

    private function apply(string $field, mixed $value, string $rule): void
    {
        [$name, $parameter] = array_pad(explode(':', $rule, 2), 2, null);

        switch ($name) {
            case 'required':
            case 'nullable':
                break;

            case 'string':
                if (!is_string($value)) {
                    $this->addError($field, 'Le champ %s doit être du texte.');
                }
                break;

            case 'email':
                if (!is_string($value) || filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
                    $this->addError($field, 'Le champ %s doit être une adresse email valide.');
                }
                break;

            case 'numeric':
                if (!is_numeric($value)) {
                    $this->addError($field, 'Le champ %s doit être un nombre.');
                }
                break;

            case 'integer':
                if (filter_var($value, FILTER_VALIDATE_INT) === false) {
                    $this->addError($field, 'Le champ %s doit être un entier.');
                }
                break;

            case 'boolean':
                if (!in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true)) {
                    $this->addError($field, 'Le champ %s doit être un booléen.');
                }
                break;

            case 'accepted':
                if (!in_array($value, [true, 1, '1', 'true', 'on', 'yes'], true)) {
                    $this->addError($field, 'Le champ %s doit être accepté.');
                }
                break;

            case 'min':
                $min = (int) $parameter;
                if (is_numeric($value) ? ((float) $value < $min) : (mb_strlen((string) $value) < $min)) {
                    $this->addError($field, "Le champ %s doit contenir au moins {$min} caractères.");
                }
                break;

            case 'max':
                $max = (int) $parameter;
                if (is_numeric($value) ? ((float) $value > $max) : (mb_strlen((string) $value) > $max)) {
                    $this->addError($field, "Le champ %s ne doit pas dépasser {$max} caractères.");
                }
                break;

            case 'in':
                $allowed = explode(',', (string) $parameter);
                if (!in_array((string) $value, $allowed, true)) {
                    $this->addError($field, 'La valeur du champ %s n\'est pas autorisée.');
                }
                break;

            case 'regex':
                if (!is_string($value) || preg_match((string) $parameter, $value) !== 1) {
                    $this->addError($field, 'Le format du champ %s est invalide.');
                }
                break;

            case 'date':
                if (strtotime((string) $value) === false) {
                    $this->addError($field, 'Le champ %s doit être une date valide.');
                }
                break;

            case 'confirmed':
                if (($this->data[$field . '_confirmation'] ?? null) !== $value) {
                    $this->addError($field, 'La confirmation du champ %s ne correspond pas.');
                }
                break;
        }
    }

    private function addError(string $field, string $template): void
    {
        $label = $this->labels[$field] ?? str_replace('_', ' ', $field);
        $this->errors[$field][] = sprintf($template, $label);
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /** @return array<string, string[]> */
    public function errors(): array
    {
        return $this->errors;
    }

    /** @return array<string, mixed> */
    public function validated(): array
    {
        return $this->validated;
    }
}
