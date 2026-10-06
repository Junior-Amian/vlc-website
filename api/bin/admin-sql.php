<?php

declare(strict_types=1);

/*
 * Prépare la requête SQL qui crée un compte administrateur, à coller dans
 * l'onglet SQL de phpMyAdmin : pour un hébergement sans terminal, où
 * bin/create-admin.php ne peut pas tourner.
 *
 *   php bin/admin-sql.php
 *
 * À lancer sur n'importe quel poste qui a PHP (XAMPP) : le script ne se
 * connecte à aucune base, il ne fait qu'écrire la requête. Elle contient
 * l'identifiant (UUID v4, que la fonction UUID() de MariaDB ne sait pas
 * produire) et l'empreinte du mot de passe, jamais le mot de passe lui-même.
 */

use App\Core\Uuid;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

require dirname(__DIR__) . '/app/Core/Uuid.php';

function ask(string $question): string
{
    echo $question;

    return trim((string) fgets(STDIN));
}

$email = mb_strtolower(ask('Email : '));

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    fwrite(STDERR, "Adresse email invalide.\n");
    exit(1);
}

$name = ask('Nom affiché (ex. : Marie-Paule) : ');
$password = ask('Mot de passe (la saisie est visible) : ');

if ($name === '' || $password === '') {
    fwrite(STDERR, "Le nom et le mot de passe sont obligatoires.\n");
    exit(1);
}

$quote = static fn (string $value): string => "'" . str_replace(['\\', "'"], ['\\\\', "\\'"], $value) . "'";

printf(
    "\nRequête à coller dans phpMyAdmin (onglet SQL de la base) :\n\nINSERT INTO admins (id, name, email, password_hash)\nVALUES (%s, %s, %s, %s);\n",
    $quote(Uuid::v4()),
    $quote($name),
    $quote($email),
    $quote(password_hash($password, PASSWORD_DEFAULT))
);
