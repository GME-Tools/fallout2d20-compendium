const e=(publication,name,frenchName,effect)=>[name,{publication,frenchName,effect}];

// Official French Core Rulebook, pp. 172-180. The English, errata-applied
// rules remain canonical whenever the two editions differ.
export const FRENCH_MAGAZINE_SERIES_2=Object.fromEntries([
  e("Duck and Cover!","Duck and Cover!","À couvert !","Une seule fois, quand vous êtes touché par une arme à Zone d’impact, vous pouvez choisir de tomber au sol. Dans ce cas, ajoutez +3 à toutes vos résistances aux dégâts contre les dégâts causés par cette arme."),
  e("Meeting People","Meeting People","Faire des rencontres","Une seule fois, quand vous obtenez une ou plusieurs complications sur un test de Discours, vous pouvez les ignorer."),
  e("¡La Fantoma!","¡La Fantoma!","Fantômes en tous genres","Quand vous réussissez un test de Discrétion pour éviter d’être repéré, vous pouvez dépenser 1 PA pour créer une diversion à portée moyenne ; le personnage qui a perdu le test en opposition se dirige vers cette diversion."),
  e("Future Weapons Today","Future Weapons Today","L’avenir des armes est à vous","Une seule fois, quand vous portez une attaque avec une arme à énergie, vous pouvez la surcharger. Augmentez ses dégâts de +2 DC ; elle ne peut pas attaquer au tour suivant, le temps de refroidir."),
  e("Boxing Times","Boxing Times","La boxe pour les passionnés","Une seule fois, quand vous réussissez une attaque avec Mains nues et dépensez des PA pour augmenter ses dégâts, vous pouvez lui ajouter l’effet Étourdissant."),
  e("Massachusetts Surgical Journal","Massachusetts Surgical Journal","Le chirurgien du Massachusetts","Une seule fois, quand vous prodiguez des soins à un autre personnage et assistez son test d’END + Survie pour guérir des blessures, considérez que votre dé d’assistance a obtenu 1."),
  e("Programmer's Digest","Programmer's Digest","Le petit livre du programmeur","Une seule fois, quand vous ratez un test de Sciences pour pirater un terminal et devriez être bloqué, votre accès n’est pas bloqué et vous pouvez tenter de nouveau."),
  e("Tales of a Junktown Jerky Vendor","Tales of a Junktown Jerky Vendor","Les aventures d’un vendeur de viande séchée de Junktown","Une seule fois, après un test de Troc pour marchander, réussi ou raté, dépensez 1 point de Chance pour modifier le prix de 10 % en votre faveur."),
  e("Fixin' Things","Fixin' Things","Réparer tout et n’importe quoi","Une seule fois, quand vous tentez de réparer un objet, réduisez de moitié les composants nécessaires, en arrondissant au supérieur."),
  e("True Police Stories","True Police Stories","Vraies histoires de police","Une seule fois, quand vous lancez les dés de dégâts d’une attaque, dépensez 1 point de Chance pour choisir le résultat de jusqu’à 3 DC au lieu de les lancer."),

  e("Unstopables","Dr. Brainwash and His Army of De-Capitalists!","Dr. Brainwash et son armée de dé-capitalistes !","Vous pouvez dépenser 3 points de Chance pour éviter tous les dégâts infligés par une seule attaque ou un seul danger."),
  e("Unstopables","Who Can Stop the Unstoppable Grog-Na-Rok?!","Qui peut arrêter l’inarrêtable Grog-Na-Rok ?!","Vous pouvez dépenser 2 points de Chance pour éviter tous les dégâts d’une attaque portée par un Humain Mutant, y compris une goule ou un super mutant."),
  e("Unstopables","Commie-Kazi vs. Manta Man","Péril Rouge contre Ray Manta","Vous pouvez dépenser 1 point de Chance pour éviter tous les dégâts infligés par une arme à Zone d’impact."),
  e("Unstopables","Trapped in the Dimension of the Pterror-dactyls","Piégé dans la dimension des pterreurdactyles !","Vous pouvez dépenser 1 point de Chance pour éviter tous les dégâts infligés par une seule attaque de corps à corps."),
  e("Unstopables","Visit the Ux-Ron Galaxy!","Visitez la galaxie Ux-Ron !","Vous pouvez dépenser 1 point de Chance pour éviter tous les dégâts énergétiques infligés par une seule attaque."),

  e("U.S. Covert Operations Manual","FH 5-01 Whistling in the Dark","FH 5-01 Siffloter dans les ténèbres","Si vous êtes repéré en tentant d’être discret, ajoutez +2 à votre résistance aux dégâts balistiques contre la première attaque reçue après avoir été repéré."),
  e("U.S. Covert Operations Manual","FH 5-02 Urban Camouflage","FH 5-02 Le camouflage urbain","La difficulté des tests des ennemis pour vous repérer augmente de +1 ; ce bonus ne se cumule pas avec ceux dus à une faible lumière ou à l’obscurité."),
  e("U.S. Covert Operations Manual","FH 5-03 Facepaint Fundamentals","FH 5-03 Fondamentaux du camouflage facial","Vous gagnez +1 à toutes vos résistances aux dégâts contre les attaques des PNJ personnages."),
  e("U.S. Covert Operations Manual","FH 5-04 Not the Soldiers You’re Looking For","FH 5-04 Ce ne sont pas les soldats que vous recherchez","Vos attaques contre les PNJ personnages infligent +1 DC de dégâts."),
  e("U.S. Covert Operations Manual","FH 5-05 Who Goes There?","FH 5-05 Qui-va-là ?","Quand vous dépensez 1 point de Chance pour relancer 1d20 sur un test de PER, considérez que ce dé a obtenu 1 au lieu de le relancer."),
  e("U.S. Covert Operations Manual","FH 5-06 Squeaky Floorboard, Sudden Death","FH 5-06 Parquet grinçant, mort instantanée","Une seule fois, ignorez une ou plusieurs complications obtenues sur un test de Discrétion."),
  e("U.S. Covert Operations Manual","FH 5-07 Getting the Drop on the Communists","FH 5-07 Faire tomber les communistes","Une fois, quand un ennemi vise avant de vous attaquer, vous pouvez lui faire perdre les bénéfices de la visée."),
  e("U.S. Covert Operations Manual","FH 5-08 Bushes, Boxes, and Beehives: Camouflage Special","FH 5-08 Spécial camouflage : buissons, caisses et ruches","Une attaque à mains nues ou portée avec un couteau inflige +2 DC de dégâts."),
  e("U.S. Covert Operations Manual","FH 5-09 Look Better in Black","FH 5-09 Le noir vous va si bien","Une fois, quand vous utilisez un Stealth Boy, il dure un tour supplémentaire."),
  e("U.S. Covert Operations Manual","FH 5-10 Tiptoe Through the Tulips","FH 5-10 Sur la pointe des pieds dans les tulipes","Quand vous dépensez 1 point de Chance pour relancer 1d20 sur un test d’AGI, considérez que ce dé a obtenu 1 au lieu de le relancer."),

  e("Tesla Science Magazine","Will Robots Rule the World?","Les robots dirigeront-ils le monde ?","Vous gagnez +2 en résistance aux dégâts balistiques et énergétiques contre les Robots."),
  e("Tesla Science Magazine","What Is Plasma, Anyway?","Qu’est-ce que le Plasma, d’abord ?","Vous gagnez +2 en résistance aux dégâts balistiques et énergétiques contre les armes plasma."),
  e("Tesla Science Magazine","Rocket Science for Toddlers","La science, c’est pas sorcier !","Une attaque avec une arme à Zone d’impact inflige +2 DC de dégâts."),
  e("Tesla Science Magazine","Tomorrow's Technology for Today's Super Soldiers","Technologie de demain pour supersoldats d’aujourd’hui","Après avoir dépensé 1 charge de réacteur à fusion, vous pouvez dépenser 1 point de Chance pour que cette charge ne soit pas dépensée."),
  e("Tesla Science Magazine","Giant Super Weapons!","Un flingue n’est jamais assez gros !","Une seule fois, quand vous tirez avec une arme Gatling, vous consommez les munitions à 8 fois le rythme normal au lieu de 10 fois."),
  e("Tesla Science Magazine","Geckos and Gamma Radiation","Geckos et radiations gamma","Une attaque contre une créature Mutante inflige +2 DC de dégâts."),
  e("Tesla Science Magazine","U.S. Army Goes to Space","L’armée des États-Unis dans l’espace","Sur une attaque avec une arme à énergie, vous infligez un coup critique dès 3 dégâts après résistance au lieu de 5."),
  e("Tesla Science Magazine","10 Number 1 Hits!!! Rock-o-bot Takes the Nation by Storm!!","10 hits n°1 !!! Rock-o-bot prend le pays par surprise !","Une seule fois, quand vous infligez un coup critique, augmentez de +2 le total des dégâts infligés."),
  e("Tesla Science Magazine","Future of Warfare?","L’avenir de la guerre ?","Sur une attaque avec une arme maniée avec Armes lourdes, vous infligez un coup critique dès 3 dégâts après résistance au lieu de 5."),

  e("Live & Love","Life Long Best Friends!","Meilleurs amis pour la vie !","Tous les membres du groupe gagnent +1 PV maximum pendant une scène."),
  e("Live & Love","Nuke-the-Man!","Explose ce gars !","Les attaques de tous les membres du groupe infligent +1 DC de dégâts pendant une scène."),
  e("Live & Love","Trim the Fat!","En finir avec le gras !","Vous récupérez deux fois plus de PV en mangeant des fruits ou des légumes pendant une scène."),
  e("Live & Love","The Secretary Charmer","Une si charmante secrétaire","Au début d’une scène, ajoutez +1 PA à la réserve du groupe."),
  e("Live & Love","Talk Yourself Sober","Lève le coude, mais pas trop !","Vous gagnez 1 point de Chance, perdu à la fin de la scène s’il n’est pas utilisé, quand vous consommez une boisson Alcoolisée."),
  e("Live & Love","Advice from Married Men","Conseils pour hommes mariés","Tous les membres du groupe gagnent +1 en résistance aux dégâts balistiques pendant une scène."),
  e("Live & Love","Beware the Man Handler","Méfiez-vous du dresseur d’hommes","La réserve de PA du groupe peut contenir 1 PA de plus que la normale pendant une scène."),
  e("Live & Love","An Experience to Remember","Une expérience marquante","Choisissez une autre aptitude de magazine déjà utilisée mais pas apprise : elle s’applique maintenant."),
  e("Live & Love","I Married a Robot","J’ai épousé un robot","Vous gagnez +2 à toutes les résistances aux dégâts contre les Robots pendant une scène.")
]);

export const FRENCH_PUBLICATION_LABELS_2={
  "Duck and Cover!":"À couvert !","Meeting People":"Faire des rencontres","¡La Fantoma!":"Fantômes en tous genres",
  "Future Weapons Today":"L’avenir des armes est à vous","Boxing Times":"La boxe pour les passionnés",
  "Massachusetts Surgical Journal":"Le chirurgien du Massachusetts","Programmer's Digest":"Le petit livre du programmeur",
  "Tales of a Junktown Jerky Vendor":"Les aventures d’un vendeur de viande séchée de Junktown",
  "Fixin' Things":"Réparer tout et n’importe quoi","True Police Stories":"Vraies histoires de police",
  "Unstopables":"Les Increvables","U.S. Covert Operations Manual":"Manuel d’opérations secrètes de l’armée américaine",
  "Tesla Science Magazine":"Science Tesla","Live & Love":"Vie et amour"
};

export const FRENCH_PUBLICATION_DESCRIPTIONS_2={
  "Duck and Cover!":"Un livre d’avant-guerre sur la fabrication, l’utilisation et le désamorçage d’explosifs.",
  "Meeting People":"Un manuel de base sur les interactions sociales, pour ceux qui manquent d’aisance avec les autres.",
  "¡La Fantoma!":"Un comic d’avant-guerre racontant les aventures d’un expert en discrétion et en infiltration.",
  "Future Weapons Today":"Un magazine consacré aux armes à énergie et aux technologies nouvelles.",
  "Boxing Times":"Un magazine d’avant-guerre destiné aux passionnés de boxe.",
  "Massachusetts Surgical Journal":"Un périodique médical d’avant-guerre consacré aux sciences et technologies médicales.",
  "Programmer's Digest":"Un magazine consacré à l’informatique, à la programmation et au cryptage.",
  "Tales of a Junktown Jerky Vendor":"Une série artisanale d’après-guerre écrite par un vendeur de viande séchée de Junktown.",
  "Fixin' Things":"Un magazine rempli de conseils pour réparer et rafistoler objets et matériaux.",
  "True Police Stories":"Un magazine pulp d’avant-guerre consacré aux enquêtes criminelles et arrestations célèbres.",
  "Unstopables":"Un comic d’Hubris Comics réunissant plusieurs de ses héros au sein des Increvables.",
  "U.S. Covert Operations Manual":"Un manuel militaire confidentiel consacré à l’art du subterfuge.",
  "Tesla Science Magazine":"Un magazine d’information sur les domaines de pointe de la science et de la technologie.",
  "Live & Love":"Une série d’avant-guerre consacrée au quotidien, aux relations et aux conseils de vie."
};
