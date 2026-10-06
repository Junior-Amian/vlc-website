<?php

declare(strict_types=1);

namespace App\Content;

/**
 * Structure du contenu modifiable du site, section par section.
 *
 * Source unique pour trois usages :
 * - la validation des enregistrements (ContentValidator) ;
 * - les formulaires du panel, générés à partir de ce schéma (GET /admin/schema) ;
 * - l'assemblage du contenu public (ContentPublisher).
 *
 * Types de champ :
 * - string, text (multiligne), email, url, slug : chaînes ;
 * - select (options ou optionsFrom), icon (liste ICONS) ;
 * - boolean ;
 * - image : identifiant d'un média, ou null ;
 * - list : liste de chaînes (`of` : string ou text) ;
 * - items : liste d'objets décrits par `fields`.
 *
 * `pattern` est une expression régulière PHP, appliquée par le serveur seul ;
 * le panel affiche `patternMessage` en cas de refus. `uppercase` met la
 * saisie en majuscules avant validation.
 *
 * Toute modification ici doit être répercutée dans les types du front
 * (frontend/src/content/types.ts), qui affiche ce contenu.
 */
final class ContentSchema
{
    /** Les quatre couleurs du logo (BrandColor côté front). */
    public const COLORS = [
        ['value' => 'blue', 'label' => 'Bleu'],
        ['value' => 'red', 'label' => 'Rouge'],
        ['value' => 'green', 'label' => 'Vert'],
        ['value' => 'yellow', 'label' => 'Jaune'],
    ];

    /**
     * Icônes proposées dans le panel.
     *
     * Chacune DOIT figurer dans la police d'icônes réduite du site
     * (icon_names= dans frontend/index.html) : sinon elle s'affiche comme un
     * mot (« school ») au lieu d'un pictogramme.
     */
    public const ICONS = [
        'account_balance', 'business_center', 'call', 'chat', 'favorite', 'flight',
        'flight_land', 'flight_takeoff', 'forum', 'gavel', 'home_work', 'location_on',
        'luggage', 'mail', 'notifications_active', 'payments', 'schedule', 'school',
        'shield', 'sports_soccer', 'verified', 'work',
    ];

    /**
     * Identifiants déjà portés par les sections de la page : une prestation
     * ne peut pas les prendre comme ancre, le lien mènerait ailleurs.
     */
    public const RESERVED_SLUGS = [
        'accueil', 'fondateurs', 'services', 'college-universel', 'temoignages',
        'espace-client', 'contact', 'pied-de-page', 'contenu', 'menu-mobile',
    ];

    /** @var array<string, array<string, mixed>>|null */
    private static ?array $sections = null;

    /** @return array<string, array<string, mixed>> Sections dans l'ordre de la page. */
    public static function sections(): array
    {
        return self::$sections ??= self::define();
    }

    /** @return array<string, mixed>|null */
    public static function section(string $key): ?array
    {
        return self::sections()[$key] ?? null;
    }

    /** @return array<string, mixed> */
    private static function field(string $type, string $key, string $label, array $extra = []): array
    {
        return array_merge(['key' => $key, 'type' => $type, 'label' => $label, 'required' => true], $extra);
    }

    /** @return array<string, array<string, mixed>> */
    private static function define(): array
    {
        $f = self::field(...);

        $iata = [
            'max'            => 3,
            'uppercase'      => true,
            'pattern'        => '/^[A-Z]{3}$/',
            'patternMessage' => 'Trois lettres majuscules, le code IATA de l\'aéroport (ex. : YUL).',
        ];

        return [
            'hero' => [
                'label'       => 'Bannière',
                'group'       => 'content',
                'description' => 'Le haut de la page : grand titre, texte d\'accroche et photo.',
                'fields'      => [
                    $f('string', 'title', 'Titre', ['max' => 90]),
                    $f('text', 'text', 'Texte d\'accroche', ['max' => 320]),
                    $f('image', 'image', 'Photo', [
                        'required' => false,
                        'help'     => 'Format paysage, 1920 px de large au moins. Le visage doit se trouver dans la moitié droite : le texte couvre la gauche sur grand écran. Sans photo choisie, la photo actuelle (voyageuse à Paris) reste en place.',
                    ]),
                ],
            ],

            'departures' => [
                'label'       => 'Tableau des départs',
                'group'       => 'content',
                'description' => 'Le bandeau qui fait défiler les destinations sous la bannière.',
                'fields'      => [
                    $f('string', 'label', 'Libellé', ['max' => 40]),
                    $f('items', 'airports', 'Destinations', [
                        'itemLabel'  => 'Destination',
                        'titleField' => 'city',
                        'minItems'   => 3,
                        'maxItems'   => 20,
                        'fields'     => [
                            $f('string', 'code', 'Code aéroport', $iata),
                            $f('string', 'city', 'Ville', ['max' => 40]),
                        ],
                    ]),
                ],
            ],

            'about' => [
                'label'       => 'À propos',
                'group'       => 'content',
                'description' => 'La présentation de Marc-Peniel et Marie-Paule.',
                'fields'      => [
                    $f('string', 'titleLead', 'Début du titre', ['max' => 40]),
                    $f('string', 'names', 'Prénoms (suite du titre)', [
                        'max'  => 40,
                        'help' => 'Toujours affiché sur une seule ligne : rester court.',
                    ]),
                    $f('text', 'lead', 'Accroche', ['max' => 260]),
                    $f('list', 'paragraphs', 'Récit', [
                        'of'       => 'text',
                        'max'      => 700,
                        'maxItems' => 6,
                        'required' => false,
                        'help'     => 'Un bloc par paragraphe. Masqué sur téléphone, où l\'accroche et la citation suffisent.',
                    ]),
                    $f('text', 'quote', 'Citation', ['max' => 220]),
                    $f('items', 'values', 'Valeurs', [
                        'itemLabel'  => 'Valeur',
                        'titleField' => 'title',
                        'maxItems'   => 3,
                        'required'   => false,
                        'help'       => 'Trois au plus, sur une ligne. Masquées sur téléphone.',
                        'fields'     => [
                            $f('icon', 'icon', 'Icône'),
                            $f('string', 'title', 'Titre', ['max' => 40]),
                            $f('text', 'text', 'Texte', ['max' => 140]),
                        ],
                    ]),
                    $f('image', 'portrait', 'Portrait du couple', [
                        'required' => false,
                        'help'     => 'Format portrait (3:4), 900 × 1200 px au moins, visages au centre : la photo est recadrée en 4:3 sur téléphone.',
                    ]),
                ],
            ],

            'services' => [
                'label'       => 'Prestations',
                'group'       => 'content',
                'description' => 'Les fiches des prestations visa, leur ordre et leur couleur.',
                'fields'      => [
                    $f('string', 'title', 'Titre de la section', [
                        'max'  => 90,
                        'help' => 'Pensez à le mettre à jour s\'il annonce un nombre de prestations.',
                    ]),
                    $f('text', 'intro', 'Introduction', ['max' => 300]),
                    $f('items', 'items', 'Prestations', [
                        'itemLabel'  => 'Prestation',
                        'titleField' => 'title',
                        'minItems'   => 1,
                        'maxItems'   => 12,
                        'help'       => 'Évitez de donner la même couleur à deux fiches voisines.',
                        'fields'     => [
                            $f('boolean', 'published', 'Affichée sur le site', ['default' => true]),
                            $f('string', 'title', 'Titre', ['max' => 60]),
                            $f('slug', 'slug', 'Ancre', [
                                'max'    => 50,
                                'unique' => true,
                                'help'   => 'Identifiant dans l\'adresse (…/#visa-etudiant) : minuscules, chiffres et tirets. Le changer casse les liens déjà partagés.',
                            ]),
                            $f('icon', 'icon', 'Icône'),
                            $f('select', 'color', 'Couleur', ['options' => self::COLORS]),
                            $f('string', 'tagline', 'Accroche', ['max' => 140]),
                            $f('text', 'description', 'Description', ['max' => 900]),
                            $f('list', 'destinations', 'Destinations', [
                                'of'       => 'string',
                                'max'      => 40,
                                'maxItems' => 6,
                                'required' => false,
                            ]),
                        ],
                    ]),
                ],
            ],

            'college' => [
                'label'       => 'Collège Universel',
                'group'       => 'content',
                'description' => 'Le partenariat avec le Collège Universel de Gatineau. Aucune promesse d\'admission ni de visa : le contrat de référent l\'interdit.',
                'fields'      => [
                    $f('string', 'title', 'Titre', ['max' => 90]),
                    $f('text', 'intro', 'Présentation', ['max' => 400]),
                    $f('string', 'address', 'Adresse du collège', ['max' => 100]),
                    $f('url', 'url', 'Site du collège', ['max' => 200]),
                    $f('string', 'urlLabel', 'Texte du lien', ['max' => 60]),
                    $f('string', 'stampValue', 'Tampon : chiffre', ['max' => 3]),
                    $f('string', 'stampUnit', 'Tampon : unité', ['max' => 24]),
                    $f('string', 'captionStrong', 'Légende du tampon (en gras)', ['max' => 80]),
                    $f('text', 'captionText', 'Légende du tampon (suite)', ['max' => 200]),
                    $f('items', 'steps', 'Étapes du parcours', [
                        'itemLabel'  => 'Étape',
                        'titleField' => 'title',
                        'minItems'   => 1,
                        'maxItems'   => 6,
                        'fields'     => [
                            $f('string', 'title', 'Titre', ['max' => 60]),
                            $f('string', 'delay', 'Délai mis en avant', [
                                'max'      => 40,
                                'required' => false,
                                'help'     => 'Facultatif. Renseigné, l\'étape est mise en évidence en jaune.',
                            ]),
                            $f('text', 'text', 'Texte', ['max' => 300]),
                            $f('string', 'issuer', 'Délivré par', ['max' => 60]),
                        ],
                    ]),
                    $f('string', 'feesTitle', 'Encadré frais : titre', ['max' => 100]),
                    $f('text', 'feesText', 'Encadré frais : texte', ['max' => 260]),
                    $f('string', 'ctaLabel', 'Texte du bouton', ['max' => 30]),
                    $f('text', 'disclaimer', 'Mention finale', ['max' => 300]),
                ],
            ],

            'testimonials' => [
                'label'       => 'Témoignages',
                'group'       => 'content',
                'description' => 'Les cartes d\'embarquement des clients. Nom et photo uniquement avec leur accord écrit.',
                'fields'      => [
                    $f('string', 'title', 'Titre', ['max' => 90]),
                    $f('text', 'intro', 'Introduction', ['max' => 240]),
                    $f('items', 'items', 'Témoignages', [
                        'itemLabel'  => 'Témoignage',
                        'titleField' => 'name',
                        'maxItems'   => 12,
                        'required'   => false,
                        'fields'     => [
                            $f('boolean', 'published', 'Affiché sur le site', ['default' => true]),
                            $f('string', 'name', 'Nom', ['max' => 40, 'help' => 'Prénom et initiale du nom suffisent (ex. : Aïcha T.).']),
                            $f('select', 'service', 'Prestation', [
                                'optionsFrom' => 'services',
                                'help'        => 'Donne la couleur de la carte et l\'étiquette du motif.',
                            ]),
                            $f('string', 'fromCode', 'Départ : code', ['default' => 'ABJ'] + $iata),
                            $f('string', 'fromCity', 'Départ : ville', ['max' => 40, 'default' => 'Abidjan']),
                            $f('string', 'toCode', 'Arrivée : code', $iata),
                            $f('string', 'toCity', 'Arrivée : ville', ['max' => 40]),
                            $f('text', 'quote', 'Témoignage', ['max' => 320]),
                            $f('image', 'photo', 'Photo', [
                                'required' => false,
                                'help'     => 'Carrée, 200 × 200 px au moins.',
                            ]),
                        ],
                    ]),
                ],
            ],

            'portal' => [
                'label'       => 'Espace client',
                'group'       => 'content',
                'description' => 'L\'annonce de l\'espace client à venir.',
                'fields'      => [
                    $f('string', 'badge', 'Pastille', ['max' => 30]),
                    $f('string', 'title', 'Titre', ['max' => 90]),
                    $f('text', 'text', 'Texte', ['max' => 400]),
                    $f('items', 'features', 'Fonctionnalités', [
                        'itemLabel'  => 'Fonctionnalité',
                        'titleField' => 'text',
                        'maxItems'   => 6,
                        'required'   => false,
                        'fields'     => [
                            $f('icon', 'icon', 'Icône'),
                            $f('string', 'text', 'Texte', ['max' => 60]),
                        ],
                    ]),
                    $f('text', 'aside', 'Encadré', ['max' => 240]),
                ],
            ],

            'contact' => [
                'label'       => 'Contact',
                'group'       => 'content',
                'description' => 'Le texte d\'invitation à côté du formulaire.',
                'fields'      => [
                    $f('string', 'eyebrow', 'Surtitre', ['max' => 40]),
                    $f('string', 'title', 'Titre', ['max' => 90]),
                    $f('text', 'text', 'Texte', ['max' => 260]),
                ],
            ],

            'company' => [
                'label'       => 'Coordonnées',
                'group'       => 'settings',
                'description' => 'Téléphone, WhatsApp, email et textes repris sur tout le site.',
                'fields'      => [
                    $f('string', 'slogan', 'Slogan', ['max' => 80]),
                    $f('text', 'description', 'Description pour Google', [
                        'max'  => 300,
                        'help' => 'Texte affiché sous le titre du site dans les résultats de recherche. 160 caractères environ.',
                    ]),
                    $f('string', 'phoneDisplay', 'Téléphone (affiché)', [
                        'max'  => 30,
                        'help' => 'Tel qu\'il apparaît sur le site, ex. : 01 51 46 30 51.',
                    ]),
                    $f('string', 'phoneIntl', 'Téléphone (international)', [
                        'max'            => 30,
                        'pattern'        => '/^\+[0-9 ]{8,20}$/',
                        'patternMessage' => 'Commencez par l\'indicatif, ex. : +225 01 51 46 30 51.',
                        'help'           => 'Sert aussi au bouton d\'appel.',
                    ]),
                    $f('string', 'whatsapp', 'Numéro WhatsApp', [
                        'max'            => 15,
                        'pattern'        => '/^[0-9]{8,15}$/',
                        'patternMessage' => 'Chiffres uniquement, indicatif compris, sans + ni espace : 2250151463051.',
                    ]),
                    $f('email', 'email', 'Email', ['max' => 180]),
                    $f('string', 'city', 'Ville', ['max' => 60]),
                    $f('text', 'footerText', 'Présentation du pied de page', ['max' => 200]),
                ],
            ],
        ];
    }
}
