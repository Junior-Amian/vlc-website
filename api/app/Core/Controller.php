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
}
