<?php

declare(strict_types=1);

/*
 * Crée un compte client de test, déjà activé, avec un dossier ouvert et les
 * pièces par défaut — ou remplace le mot de passe d'un compte existant.
 *
 *   php bin/create-client.php client@visilion.com "mot-de-passe" ["Nom affiché"]
 *
 * Poste local uniquement (APP_ENV=local ou development) : le compte est créé
 * comme le ferait le panel (« Dossiers clients » → ouvrir un dossier), mais
 * sans passer par le lien d'invitation, puisque le mot de passe est fixé ici.
 * En production, un client choisit toujours le sien depuis son invitation.
 *
 * Le formulaire d'ouverture de dossier reste à remplir : il s'affiche à la
 * première connexion, comme pour un vrai client.
 */

use App\Core\Autoloader;
use App\Core\Database;
use App\Core\Env;
use App\Dossiers\DossierView;
use App\Dossiers\Process;
use App\Models\Admin;
use App\Models\ChecklistItem;
use App\Models\Client;
use App\Models\Dossier;

if (PHP_SAPI !== 'cli') {
    exit(1);
}

define('BASE_PATH', dirname(__DIR__));

require BASE_PATH . '/app/Core/Autoloader.php';
Autoloader::register();

Env::load(BASE_PATH . '/.env');

if (!in_array(Env::get('APP_ENV', 'production'), ['local', 'development'], true)) {
    fwrite(STDERR, "Réservé au poste local (APP_ENV=local). En production, ouvrez le dossier dans le panel.\n");
    exit(1);
}

$email = mb_strtolower(trim((string) ($argv[1] ?? '')));
$password = (string) ($argv[2] ?? '');
$name = trim((string) ($argv[3] ?? 'Client de test'));

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || $password === '') {
    fwrite(STDERR, "Usage : php bin/create-client.php <email> <mot-de-passe> [\"Nom affiché\"]\n");
    exit(1);
}

// Pas de longueur minimale ici, contrairement à l'écran « Choisir mon mot de
// passe » (8 caractères) : le script ne sert qu'aux comptes de test du poste
// local, où un mot de passe court est voulu (« admin », 10/10/2026).

$hash = password_hash($password, PASSWORD_DEFAULT);
$clients = new Client();
$existing = $clients->findByEmail($email);

if ($existing !== null) {
    // Ferme aussi les sessions ouvertes avec l'ancien mot de passe.
    $clients->setPassword((string) $existing['id'], $hash);
    echo "Mot de passe de {$email} remplacé.\n";
    exit(0);
}

// Première prestation de la page, comme le premier choix du formulaire du panel.
$service = array_key_first(DossierView::services());

if ($service === null) {
    fwrite(STDERR, "Aucune prestation dans le contenu du site : importez d'abord seed.sql.\n");
    exit(1);
}

$admin = (new Admin())->findByEmail('admin@visilion.test');
$db = Database::connection();
$db->beginTransaction();

try {
    $clientId = $clients->create(['email' => $email, 'full_name' => $name, 'phone' => '']);
    $clients->setPassword($clientId, $hash);

    $dossierId = (new Dossier())->create([
        'client_id'  => $clientId,
        'service'    => $service,
        'country'    => '',
        'step'       => Process::FIRST_STEP,
        'created_by' => $admin !== null ? (string) $admin['id'] : null,
    ]);

    $items = new ChecklistItem();

    foreach (Process::DEFAULT_CHECKLIST as $position => $item) {
        $items->create([
            'dossier_id' => $dossierId,
            'label'      => $item['label'],
            'help'       => $item['help'],
            'required'   => $item['required'] ? 1 : 0,
            'position'   => $position,
        ]);
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();

    throw $e;
}

echo "Compte {$email} créé, avec un dossier « {$service} ». Connexion sur /espace-client.\n";
