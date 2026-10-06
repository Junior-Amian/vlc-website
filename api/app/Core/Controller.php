<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Classe de base des contrôleurs.
 */
abstract class Controller
{
    /**
     * Valide les données de la requête et renvoie les valeurs nettoyées.
     *
     * @param array<string, string> $rules
     * @param array<string, string> $labels
     * @return array<string, mixed>
     * @throws ValidationException
     */
    protected function validate(Request $request, array $rules, array $labels = []): array
    {
        $validator = new Validator($request->body + $request->query, $rules, $labels);

        if ($validator->fails()) {
            throw new ValidationException($validator->errors());
        }

        return $validator->validated();
    }

    /**
     * L'identifiant {id} de l'adresse, s'il a la forme d'un UUID v4 ; une
     * chaîne vide sinon, que find() ne trouve jamais.
     */
    protected function routeId(Request $request, string $name = 'id'): string
    {
        $id = (string) $request->param($name, '');

        return Uuid::isValid($id) ? $id : '';
    }
}
