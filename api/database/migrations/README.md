# Migrations de la base

Une fois le site en ligne, la base du client contient des données réelles :
on ne la recrée plus à partir de `schema.sql`. Chaque changement de
structure (table, colonne, index) passe alors par un script de ce dossier,
importé dans phpMyAdmin sur la base existante.

## Règles

1. **Un fichier par changement**, numéroté à la suite :
   `001_ajout_rappels.sql`, `002_…`. Le numéro fixe l'ordre d'import ; on ne
   renumérote jamais un fichier déjà importé quelque part.
2. **Le fichier se termine par son inscription** dans la table de version :

   ```sql
   INSERT INTO `schema_migrations` (`version`) VALUES ('001_ajout_rappels');
   ```

   Le nom inscrit est celui du fichier, sans `.sql`. Importer deux fois la
   même migration échoue donc sur cette ligne, au lieu de passer inaperçu.
3. **`schema.sql` est mis à jour en même temps**, pour qu'une installation
   neuve obtienne directement la structure finale, et la version est ajoutée
   à l'`INSERT IGNORE` de sa dernière ligne.
4. **Un fichier importé ne se modifie plus.** Pour corriger une migration
   déjà passée, en écrire une nouvelle.
5. **Changements destructeurs en deux temps** (renommer ou supprimer une
   colonne) : ajouter la nouvelle colonne et la remplir, livrer le code qui
   l'utilise, puis seulement retirer l'ancienne dans une migration suivante.
   Le code en ligne ne doit jamais lire une colonne qui n'existe plus.

## Savoir où en est une base

```sql
SELECT `version`, `applied_at` FROM `schema_migrations` ORDER BY `version`;
```

Les fichiers de ce dossier dont le nom n'apparaît pas dans le résultat
restent à importer, dans l'ordre de leur numéro. **Faire une sauvegarde de la
base avant** (phpMyAdmin > Exporter).

`000_initial` correspond à `schema.sql` tel qu'il était à la première mise en
ligne : il n'a pas de fichier dans ce dossier.
