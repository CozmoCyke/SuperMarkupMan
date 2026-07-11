# Audit et feuille de route - SuperMarkupMan

Date de l'audit: 2026-07-11

Ce document décrit l'etat actuel du projet **sans modifier le gameplay**. Le depot est bien initialise Git, sur la branche `main`, et aucun changement de code n'a ete apporte pendant cet audit.

## 1. Lecture precise du jeu

### Concept general

SuperMarkupMan est un platformer 2D pedagogue ou le personnage principal sert de "curseur vivant" pour reconstituer du HTML. Le joueur doit faire correspondre la zone de droite, qui montre le rendu courant, avec la zone de gauche, qui montre le HTML cible.

Le principe n'est pas d'ecrire du code au clavier, mais de deplacer physiquement des blocs HTML dans le bon ordre visuel. Quand l'ordre spatial est correct, le HTML "produit" par le niveau est valide et le niveau suivant se debloque.

### Gameplay moment par moment

- Le personnage se deplace dans un espace vertical simple, avec plateformes et gravite.
- Les tags HTML sont representes comme des blocs visuels qui tombent, reposent sur les plateformes, et peuvent etre portes par le personnage.
- Le joueur ne manipule pas directement le DOM avec une souris: il transporte des blocs en courant, sautant, et les deposant.
- La progression est chronometree et persiste en `localStorage`.
- Il existe un etat de pause pour les fenetres d'aide, de reset, et de fin.

### Controles

D'apres `index.html` et `scripts/game.js`:

- `UP`: sauter.
- Maintenir `UP`: sauter plus haut.
- `DOWN`: traverser les plateformes.
- `SPACE`: ramasser ou deposer un bloc HTML.
- `ESC`: fermer les fenetres modales.
- `LEFT` / `RIGHT`: deplacement horizontal.

### Mecanique de saut et mouvement

La logique du joueur dans [`scripts/player.js`](./scripts/player.js) combine:

- une vitesse horizontale progressive,
- une gravite simple,
- une impulsion de saut,
- une variable `airTime` qui nuance la tenue du saut,
- un etat `pickup` qui bloque temporairement le mouvement pendant l'animation de saisie/depose.

Le joueur peut aussi traverser les plateformes avec `DOWN`, mais seulement si la logique de collision le permet et si le joueur n'est pas en phase de saut ascendante.

### Ramassage et transport des blocs

Le transport repose sur un etat de "portage" plutot que sur un drag-and-drop:

- `SPACE` declenche une animation de ramassage.
- Si le personnage est a proximite d'un bloc au bon moment, ce bloc devient `carrying`.
- Tant que le personnage porte un bloc, la position du bloc est accrochee au joueur dans [`scripts/block.js`](./scripts/block.js).
- Quand l'animation se termine, un second appui sur `SPACE` permet de deposer.

### Niveaux

Les niveaux sont definis dans [`scripts/game.js`](./scripts/game.js), dans la fonction `levelUp(x)`, via un gros `switch` numerote de 1 a 30.

Les niveaux couvrent progressivement:

- des balises de texte simples, comme `a`, `em`, `strong`,
- les balises de saut de ligne et de paragraphe,
- les balises image, titre et trait horizontal,
- les listes `ul`, `ol`, `li`,
- des combinaisons imbriquees plus complexes.

Le niveau final de "completion" n'est pas un vrai niveau de puzzle; il sert d'ecran de finition et d'etat de post-jeu.

### Comment le HTML est produit

Le HTML cible est construit comme une chaine (`level`) dans `levelUp`.

Le pipeline est:

1. definir une chaine de markup cible pour le niveau courant;
2. transformer chaque tag de cette chaine en bloc jouable via la table `tags`;
3. afficher la version cible dans la colonne de gauche;
4. reecrire la colonne de droite avec le HTML reconstitue en triant les blocs selon leur position.

La fonction `validate()`:

- copie `blocks`,
- trie les blocs par `y`, puis `x`,
- concatene les `html` de chaque bloc dans cet ordre,
- injecte le resultat dans `#right`,
- compare la chaine obtenue a la solution attendue.

Autrement dit, l'ordre visuel des blocs devient l'ordre HTML final.

## 2. Cartographie des fichiers, modules et assets

### Entree et infrastructure

- [`index.html`](./index.html): page principale, structure DOM, overlays, canvas, audio, scripts.
- [`styles.css`](./styles.css): mise en page, colonnes gauche/droite, overlays, animations, styles du jeu.
- [`server.js`](./server.js): serveur statique Node.js pour `npm start`.
- [`package.json`](./package.json): script `start`.

### Logique de jeu

- [`scripts/graphics.js`](./scripts/graphics.js): chargement des images, creation du canvas, boucle de rendu, formatage du temps.
- [`scripts/player.js`](./scripts/player.js): physique du joueur, saut, marche, ramassage, animation du personnage.
- [`scripts/block.js`](./scripts/block.js): creation et comportement des blocs HTML transportables.
- [`scripts/game.js`](./scripts/game.js): etat global, input clavier, niveaux, validation, progression, fenetres, reset, telechargement.

### Bibliotheque

- [`vendor/jquery.min.js`](./vendor/jquery.min.js): dependance locale jQuery.

### Assets graphiques

- `images/spritesheet.png`: sprite du personnage.
- `images/plank.png`: plateforme.
- `images/download.png`: bouton de telechargement.
- `images/loading.gif`: indicateur de chargement.
- `images/check.png`: confirmation de validation.
- `images/markup-man.png`: illustration du personnage dans l'aide.
- `images/keys.png`: aide clavier.
- `images/sample.png`: image exemple pour `img`.
- `images/tag-samples.png`: exemple d'ordre de balises dans l'aide.
- `images/tag-text.png`: bloc texte.
- `images/tag-*.png`: sprites des balises HTML ouvertes/fermees, notamment `a`, `br`, `em`, `h1`, `h2`, `hr`, `img`, `li`, `ol`, `p`, `strong`, `ul`.

### Assets audio

- `sounds/drop.mp3` / `sounds/drop.wav`: son de ramassage/depose.
- `sounds/done.mp3` / `sounds/done.wav`: son de validation de niveau.
- `sounds/next.mp3` / `sounds/next.wav`: son de passage de niveau.

## 3. Limites techniques, bugs, fragilites et lisibilite

### Points fragiles importants

- L'etat global est largement partage entre fichiers via des variables implicites (`player`, `blocks`, `level`, `paused`, `time`, etc.).
- Plusieurs boucles utilisent `i`, `t`, `p` sans declaration locale stricte, ce qui cree des variables globales implicites et rend le code fragile.
- Le code utilise encore des temporisations stringifiees (`setTimeout("init()", 1000)`), qui sont moins surs et moins lisibles que des callbacks.
- La logique de jeu, la logique de validation HTML, les effets sonores, et l'interface sont entremeles dans `game.js`.
- Le projet ne separe pas le modele de niveau, le moteur physique, et le rendu DOM.

### Risques de logique

- La fonction `levelUp` reconstruit les niveaux par `switch` manuel, ce qui rend l'ajout de nouveaux niveaux penible et sujet aux doublons.
- La verification des solutions alternatives dans `levelUp` est peu claire et semble inertielle: la boucle parcourt `alt`, mais ne modifie pas effectivement `pass` en fonction du resultat.
- La generation du HTML repose sur des remplacements regex appliques aux chaines de tags. C'est pratique, mais fragile si un nouveau tag contient un motif inattendu.
- La validation se base sur une equivalence de chaine, ce qui exige un ordre et un espacement cohérents, et limite la tolerance aux variantes de rendu pourtant semantiquement equivalentes.

### Lisibilite

- `game.js` est tres dense: il melange initialisation, gestion des touches, progression, validation, progression de niveau et UI modale.
- Les niveaux sont inline dans une longue structure `switch`, donc difficiles a rechercher, comparer ou factoriser.
- Les commentaires sont utiles mais irreguliers; certaines parties importantes restent implicitement codees.
- L'absence de modules ou d'objets metiers explicites rend l'extension du jeu plus risquee que necessaire.

### Contraintes techniques du port offline

- Le jeu conserve des chemins relatifs vers les assets, ce qui est bon pour le double-clic direct sur `index.html`.
- Le serveur `server.js` est volontairement minimal et ne doit pas devenir une dependance fonctionnelle du jeu lui-meme.
- Le rendu actuel doit rester compatible avec une ouverture locale sans serveur, sinon on casserait la contrainte de portabilite.

## 4. Comment les blocs HTML sont empiles, deplaces et utilises

### Empilement

Chaque bloc possede une position `x`, `y`, une largeur, une hauteur, et une `velocityDown`.

Le tri de `validate()` impose l'ordre de lecture:

- d'abord du haut vers le bas,
- puis de gauche a droite sur une meme ligne visuelle.

Cela signifie qu'on peut physiquement empiler les blocs dans le niveau de maniere libre, mais que l'ordre final depend de leur placement spatial.

### Deplacement

Les blocs se deplacent de trois facons:

- par gravite quand ils ne sont portes par personne,
- par "collage" au personnage quand ils sont transportes,
- par collision avec plateformes et autres blocs quand ils tombent.

### Utilisation par le personnage

Le personnage:

- se place pres d'un bloc,
- déclenche le ramassage avec `SPACE`,
- porte le bloc en synchronisant sa position avec son propre sprite,
- le depose ensuite pour participer a l'ordre HTML final.

Le jeu transforme donc le personnage en outil de composition typographique spatiale. Il n'est pas juste un avatar; il est le vecteur de placement des balises.

### Role pedagogique

Ce design enseigne implicitement:

- la difference entre ordre visuel et ordre HTML,
- l'importance de l'imbrication correcte,
- les balises auto-fermees,
- les balises ouvrantes/fermantes,
- la lecture top-to-bottom, left-to-right.

## 5. Meilleures pistes d'evolution vers un vrai editeur de code jouable

### Opportunites fortes

1. Remplacer les niveaux hardcodes par des definitions de donnees.
2. Separer la representation "code", la representation "physique" et la representation "rendu".
3. Permettre de choisir entre blocs visuels, saisie textuelle assistee, et mode hybride.
4. Transformer le personnage en curseur actif qui navigue dans le code et transporte des fragments.
5. Afficher une vraie liaison live entre l'ordre des blocs et le DOM rendu.

### Ce qui manque pour devenir un "editeur jouable"

- Une structure de document explicite, au lieu de simples chaines comparees.
- Une API interne de blocs et de nuds capables d'etre deplaces, inserees, enroulees, dechirees ou refermees.
- Un moteur de validation semantique, pas seulement textuel.
- Une notion d'edition par insertion, selection, deplacement et annulation.
- Une UI qui aide a comprendre pourquoi une structure est invalide.

### Vision cible

Le personnage pourrait devenir simultanement:

- le curseur de navigation,
- le pointeur de selection,
- le transporteur de fragments,
- et l'agent de placement d'annotations HTML.

Dans cette version cible, chaque bloc ne serait plus seulement une image transportable, mais une entite d'edition. Le joueur se deplacerait dans un espace ou le document est litteralement manipulable.

## 6. Feuille de route progressive

### Phase 0 - Stabilisation sans changer le gameplay

- Conserver le double-clic direct sur `index.html`.
- Conserver `server.js` et `npm start` comme lancement d'appoint.
- Documenter les points d'entree, les niveaux et les assets.
- Ajouter des tests de non-regression structurels si le projet en gagne.

### Phase 1 - Nettoyage architectural

- Extraire les definitions de niveaux dans un fichier de donnees.
- Remplacer les variables globales implicites par des structures explicites.
- Clarifier la separation entre rendu, physique et validation.
- Isoler la logique de conversion tag -> bloc -> html.

### Phase 2 - Validation plus intelligente

- Introduire une representation intermediaire du document.
- Valider la structure semantique, pas seulement la chaine finale.
- Rendre explicites les exceptions d'ordre de balises et les cas alternatifs.
- Fournir des retours visuels sur les erreurs de structure.

### Phase 3 - Edition jouable

- Ajouter insertion, deplacement et suppression de fragments.
- Autoriser le personnage a manipuler des groupes de blocs.
- Gerer des relations parent/enfant au lieu d'un simple tri spatial.
- Ajouter annulation/refaire.

### Phase 4 - Vrai editeur-jeu

- Passer d'un puzzle de reconstitution a un editeur de code incarné.
- Ajouter des objectifs plus larges: refactoriser, corriger, optimiser, commenter.
- Rendre le rendu live plus expressif et mieux outille pedagogiquement.
- Introduire des niveaux de CSS puis eventuellement de comportement.

## 7. Verification Git

Verification effectuee pendant l'audit:

- le repertoire est bien un depot Git;
- la branche courante est `main`;
- aucun changement de fichier n'etait present au moment de l'inspection.

## 8. Resume executif

Le projet est deja une bonne base de jeu pedagogue: il est autonome, jouable hors-ligne, et sa fantaisie centrale est forte. Sa principale faiblesse est architecturale: la logique est concentree dans quelques fichiers globaux, avec beaucoup d'etat implicite et des niveaux codés en dur.

Pour evoluer vers un vrai editeur de code jouable, il faudra d'abord formaliser le document et les blocs comme donnees, puis seulement augmenter les capacites d'edition. Le meilleur atout du projet est deja la metaphorique du personnage-cursor transporteur; il faut la rendre plus robuste sans la perdre.
