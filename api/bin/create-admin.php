<?php

declare(strict_types=1);

/*
 * Crée un compte administrateur, ou remplace le mot de passe d'un compte
 * existant (mot de passe oublié).
 *
 *   php bin/create-admin.php
 *
 * À lancer depuis le dossier api/, sur un poste qui atteint la base (en
 * local avec XAMPP, ou sur l'hébergement s'il offre un terminal). Sans
 * terminal, voir la méthode phpMyAdmin dans database/README.md.
 */

use App\Core\Autoloader;
use App\Core\Env;
use App\Models\Admin;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

define('BASE_PATH', dirname(__DIR__));

require BASE_PATH . '/app/Core/Autoloader.php';
Autoloader::register();

Env::load(BASE_PATH . '/.env');

// Le panel ne fonctionne pas sans clé de signature des sessions.
if (strlen((string) Env::get('JWT_SECRET', '')) < 32) {
    echo "ATTENTION : JWT_SECRET est vide ou trop court dans .env, la connexion au panel échouera.\n";
    echo 'Générez-en un avec : php -r "echo bin2hex(random_bytes(32));"' . "\n\n";
}

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

$admins = new Admin();
$existing = $admins->findByEmail($email);

$name = $existing === null ? ask('Nom affiché (ex. : Marie-Paule) : ') : (string) $existing['name'];

if ($name === '') {
    fwrite(STDERR, "Le nom est obligatoire.\n");
    exit(1);
}

// Saisie visible : PHP ne sait pas masquer la frappe sous Windows.
$password = ask('Mot de passe (la saisie est visible) : ');

// Aucune règle de longueur, à la demande du client. Un mot de passe vide
// reste refusé : l'écran de connexion n'en accepte pas, le compte serait
// inutilisable.
if ($password === '') {
    fwrite(STDERR, "Le mot de passe ne peut pas être vide.\n");
    exit(1);
}

if (ask('Confirmez le mot de passe : ') !== $password) {
    fwrite(STDERR, "Les deux saisies diffèrent.\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

if ($existing !== null) {
    // Ferme aussi les sessions ouvertes avec l'ancien mot de passe.
    $admins->changePassword((string) $existing['id'], $hash);
    echo "Mot de passe de {$email} remplacé.\n";
    exit(0);
}

$admins->create(['name' => $name, 'email' => $email, 'password_hash' => $hash]);
echo "Compte {$email} créé. Connexion sur /admin.\n";
