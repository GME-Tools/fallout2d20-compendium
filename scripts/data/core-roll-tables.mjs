const byTotal = (formula, values) => ({ formula, results: values.map((value, index) => ({ range: [index + Number(formula[0]), index + Number(formula[0])], ...value })) });
const item = (name, pack, label = name) => ({ name: label, link: { name, pack } });
const text = (name, description = "") => ({ name, description });

export const CORE_ROLL_TABLES = [
  {
    key: "random-publication", page: 172, formula: "1d20", names: { en: "Random Publication", fr: "Publication aléatoire" },
    results: ["¡La Fantoma!", "Astoundingly Awesome Tales", "Backwoodsman", "Boxing Times", "Duck and Cover!", "Fixin’ Things", "Future Weapons Today", "Grognak the Barbarian", "Guns and Bullets", "Live & Love", "Massachusetts Surgical Journal", "Meeting People", "Programmer’s Digest", "Tales of a Junktown Jerky Vendor", "Tesla Science Magazine", "True Police Stories", "Tumblers Today", "Unstoppables", "U.S. Covert Operations Manual", "Wasteland Survival Guide"].map((name, index) => ({ range: [index + 1, index + 1], name }))
  },
  {
    key: "astoundingly-awesome-tales", page: 173, formula: "1d20", names: { en: "Random Astoundingly Awesome Tales Issues", fr: "Numéros aléatoires d’Astoundingly Awesome Tales" },
    results: ["Attack of the Fishmen!", "Rise of the Mutants!", "Attack of the Metal Men!", "The Mad Russian's Revenge!", "The Starlet Sniper!", "Curse of the Burned!", "Giant Insects Invade!", "Deadly Lasers!", "Science Gone Mad!", "Surrounded by the Dead!"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") }))
  },
  {
    key: "backwoodsman", page: 173, formula: "1d20", names: { en: "Random Backwoodsman Issues", fr: "Numéros aléatoires de Backwoodsman" },
    results: ["Get Off My Lawn", "Down Home Cookin'", "Homesteading Horror", "Hardy as a Sasquatch", "Carnivorous Rabbits of Appalachia", "The Appalachia Squirrel Massacre", "Art of the Tomahawk", "The Gunsmith of Harper’s Ferry", "The Ohio River Hermit", "Nightmare in the Garden"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") }))
  },
  {
    key: "grognak", page: "174-175", formula: "1d20", names: { en: "Random Grognak the Barbarian Issues", fr: "Numéros aléatoires de Grognak le Barbare" },
    results: ["Blood on the Harp", "Cometh the Trickster", "Jungle of the Bat-Babies", "In the Bosom of the Corsair Queen", "Demon Slaves, Demon Sands", "Enter Maula: War Maiden of Mars", "Fatherless Cur!", "Lost in the Snows of Lust", "The Lair of the Virgin Eaters", "What Sorcery is This?"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") }))
  },
  {
    key: "guns-and-bullets", page: 175, formula: "1d20", names: { en: "Random Guns and Bullets Issues", fr: "Numéros aléatoires de Guns and Bullets" },
    results: ["The Future of Hunting?", "Lasers & Hunting: Acceptable Overkill", "Little Guns for Little Ladies", "Street Guns of Detroit", "Avoid Those Pesky Gun Laws!", "The Moon: A Communist Doomsday Device?!", "Take Aim, Army Style", "Bear-Proofing your Campsite", "Plasma: The Weapon of Tomorrow", "Guide to Hunting Commies!"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") }))
  },
  {
    key: "live-and-love", page: 176, formula: "1d20", names: { en: "Random Live & Love Issues", fr: "Numéros aléatoires de Live & Love" },
    results: ["Life Long Best Friends!", "Nuke-the-Man!", "Trim the Fat!", "The Secretary Charmer", "Talk Yourself Sober", "Advice from Married Men", "Beware the Man Handler", "An Experience to Remember", "I Married a Robot"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") })).concat({ range: [19, 20], ...text("Re-roll result", "Re-roll on this table.") })
  },
  {
    key: "tesla-science", page: 177, formula: "1d20", names: { en: "Random Tesla Science Magazine Issues", fr: "Numéros aléatoires de Tesla Science Magazine" },
    results: ["Will Robots Rule the World?", "What Is Plasma, Anyway?", "Rocket Science for Toddlers", "Tomorrow's Technology for Today's Super Soldiers", "Giant Super Weapons!", "Geckos and Gamma Radiation", "U.S. Army Goes to Space", "10 Number 1 Hits!!! Rock-o-bot Takes the Nation by Storm!!", "Future of Warfare?"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") })).concat({ range: [19, 20], ...text("Re-roll result", "Re-roll on this table.") })
  },
  {
    key: "tumblers-today", page: 178, formula: "1d20", names: { en: "Random Tumblers Today Issues", fr: "Numéros aléatoires de Tumblers Today" },
    results: ["Mysteries of the Master Key Exposed!", "Bobby Pins: More Effective Than Lockpicks?", "Confessions of a Housebreaker", "Open Any Lock in 5 Seconds Flat", "Locksmith Certification Special — Pass with Flying Colors"].map((name, index) => ({ range: [index * 4 + 1, index * 4 + 4], ...item(name, "books-and-magazines") }))
  },
  {
    key: "unstoppables", page: 179, formula: "1d20", names: { en: "Random Unstoppables Issues", fr: "Numéros aléatoires des Imbattables" },
    results: ["Dr. Brainwash and His Army of De-Capitalists!", "Who Can Stop the Unstoppable Grog-Na-Rok?!", "Commie-Kazi vs. Manta Man", "Trapped in the Dimension of the Pterror-dactyls", "Visit the Ux-Ron Galaxy!"].map((name, index) => ({ range: [index * 4 + 1, index * 4 + 4], ...item(name, "books-and-magazines") }))
  },
  {
    key: "covert-operations", page: 179, formula: "1d20", names: { en: "Random U.S. Covert Operations Manual Issues", fr: "Numéros aléatoires du Manuel des opérations secrètes des États-Unis" },
    results: ["FH 5-01 Whistling in the Dark", "FH 5-02 Urban Camouflage", "FH 5-03 Facepaint Fundamentals", "FH 5-04 Not the Soldiers You’re Looking For", "FH 5-05 Who Goes There?", "FH 5-06 Squeaky Floorboard, Sudden Death", "FH 5-07 Getting the Drop on the Communists", "FH 5-08 Bushes, Boxes, and Beehives: Camouflage Special", "FH 5-09 Look Better in Black", "FH 5-10 Tiptoe Through the Tulips"].map((name, index) => ({ range: [index * 2 + 1, index * 2 + 2], ...item(name, "books-and-magazines") }))
  },
  {
    key: "wasteland-survival-guide", page: 180, formula: "1d20", names: { en: "Random Wasteland Survival Guide Issues", fr: "Numéros aléatoires du Guide de survie des Terres désolées" },
    results: [[1, 3, "Farming the Wastes"], [4, 6, "Insect Repellent Special"], [7, 9, "The Bright Side of Radiation Poisoning"], [10, 12, "Coupon Spectacular"], [13, 15, "Water Aerobics for Ghouls"], [16, 18, "Self Defense Secrets"], [19, 20, "Hunting in the Wastes"]].map(([min, max, name]) => ({ range: [min, max], ...item(name, "books-and-magazines") }))
  },
  {
    key: "random-ammunition", page: 200, names: { en: "Random Ammunition", fr: "Munitions aléatoires" },
    ...byTotal("2d20", [
      item("2mm Electromagnetic Cartridge", "ammunition", "2mm EC (6+3 CD)"), item("2mm Electromagnetic Cartridge", "ammunition", "2mm EC (6+3 CD)"), item("2mm Electromagnetic Cartridge", "ammunition", "2mm EC (6+3 CD)"), item("Plasma Cartridge", "ammunition", "Plasma Cartridge (10+5 CD)"), item("Missile", "ammunition", "Missile (2+1 CD)"), item("Fusion Core", "ammunition", "Fusion Core (1)"), item("5mm Round", "ammunition", "5mm (12+6 CD ×10)"), item("5mm Round", "ammunition", "5mm (12+6 CD ×10)"), item(".50 Round", "ammunition", ".50 ammo (4+2 CD)"), item(".50 Round", "ammunition", ".50 ammo (4+2 CD)"), item("Syringer Ammo", "ammunition", "Syringer Ammo (4+2 CD)"), item("Syringer Ammo", "ammunition", "Syringer Ammo (4+2 CD)"), item("Gamma Round", "ammunition", "Gamma Round (4+2 CD)"), item("Flamer Fuel", "ammunition", "Flamer Fuel (12+6 CD)"), item("Flamer Fuel", "ammunition", "Flamer Fuel (12+6 CD)"), item(".45 Round", "ammunition", ".45 Rounds (9+4 CD)"), item(".45 Round", "ammunition", ".45 Rounds (9+4 CD)"), item("10mm Round", "ammunition", "10mm (8+4 CD)"), item("10mm Round", "ammunition", "10mm (8+4 CD)"), item(".38 Round", "ammunition", ".38 Ammo (10+5 CD)"), item(".38 Round", "ammunition", ".38 Ammo (10+5 CD)"), item("Flare", "ammunition", "Flare (2+1 CD)"), item(".308 Round", "ammunition", ".308 ammo (6+3 CD)"), item("Shotgun Shell", "ammunition", "Shotgun Shells (6+3 CD)"), item("Shotgun Shell", "ammunition", "Shotgun Shells (6+3 CD)"), item("Fusion Cell", "ammunition", "Fusion Cell (14+7 CD)"), item("Fusion Cell", "ammunition", "Fusion Cell (14+7 CD)"), item("Railway Spike", "ammunition", "Railway Spike (6+3 CD)"), item("Railway Spike", "ammunition", "Railway Spike (6+3 CD)"), item(".44 Magnum Round", "ammunition", ".44 Magnum (4+2 CD)"), item(".44 Magnum Round", "ammunition", ".44 Magnum (4+2 CD)"), item("5.56mm Round", "ammunition", "5.56mm (8+4 CD)"), item("5.56mm Round", "ammunition", "5.56mm (8+4 CD)"), item("Missile", "ammunition", "Missile (2+1 CD)"), item("Fusion Core", "ammunition", "Fusion Core (1)"), item("Plasma Cartridge", "ammunition", "Plasma Cartridge (10+5 CD)"), item("Mini-Nuke", "ammunition", "Mini-Nuke (1+1 CD)"), item("Mini-Nuke", "ammunition", "Mini-Nuke (1+1 CD)"), item("Mini-Nuke", "ammunition", "Mini-Nuke (1+1 CD)")
    ])
  },
  {
    key: "random-armor", page: 201, names: { en: "Random Armor", fr: "Armure aléatoire" },
    ...byTotal("2d20", ["X-01 Power Armor Piece", "X-01 Power Armor Piece", "X-01 Power Armor Piece", "Power Armor Frame", "Power Armor Frame", "T-60 Power Armor Piece", "T-60 Power Armor Piece", "Heavy Dog Armor", "Heavy Dog Armor", "Sturdy Combat Armor", "Heavy Metal Armor", "Raider Power Armor Piece", "Medium Dog Armor", "Sturdy Metal Armor", "Heavy Raider Armor", "Vault-Tec Armor", "Sturdy Raider Armor", "Leather Armor", "Sturdy Raider Armor", "Raider Armor", "Sturdy Raider Armor", "Metal Armor", "Light Dog Armor", "Sturdy Leather Armor", "Combat Armor", "T-45 Power Armor Piece", "Heavy Leather Armor", "Synth Armor", "T-51 Power Armor Piece", "Heavy Combat Armor", "Heavy Combat Armor", "Sturdy Synth Armor", "Sturdy Synth Armor", "Sturdy Raider Armor", "Power Armor Frame", "Power Armor Frame", "Heavy Synth Armor", "Heavy Synth Armor", "Heavy Synth Armor"].map((name) => text(name)))
  },
  {
    key: "random-clothing", page: 201, names: { en: "Random Clothing", fr: "Vêtements aléatoires" },
    ...byTotal("2d20", ["Brotherhood of Steel Fatigues", "Welder’s Visor", "Brotherhood Scribe's Hat", "Brotherhood of Steel Hood", "Brotherhood Scribe's Armor", "Brotherhood of Steel Uniform", "Hard Hat", "Army Helmet", "Lab Coat", "Lab Coat", "Engineer's Armor", "Engineer's Armor", "Road Leathers", "Road Leathers", "Casual Clothing", "Casual Clothing", "Hides", "Hides", "Harness", "Harness", "Sack Hood", "Sack Hood", "Military Fatigues", "Military Fatigues", "Tough Clothing", "Tough Clothing", "Heavy Coat", "Heavy Coat", "Utility Overalls", "Utility Overalls", "Casual Hat", "Hood or Cowl", "Vault Jumpsuit", "Formal Clothing", "Formal Clothing", "Formal Hat", "Gas Mask", "Cage Armor", "Hazmat Suit"].map((name) => item(name, "apparel")))
  },
  {
    key: "random-food", page: 202, names: { en: "Random Food", fr: "Nourriture aléatoire" },
    ...byTotal("2d20", ["Tarberry", "Perfectly Preserved Pie", "Melon (non-irradiated)", "Carrot (non-irradiated)", "Institute Food Packet", "Sugar Bombs (Preserved)", "Mutfruit (non-irradiated)", "Fancy Lads Snack Cakes (Preserved)", "Sweet Roll", "Razorgrain", "Iguana Bits", "Cram", "Squirrel Bits", "BlamCo Brand Mac and Cheese", "Sugar Bombs", "Potted Meat", "Pork 'n' Beans", "InstaMash", "Dandy Boy Apples", "Canned Dog Food", "Fancy Lads Snack Cakes", "Gum Drops", "Mutfruit", "Potato Crisps", "Salisbury Steak", "Yum-Yum Deviled Eggs", "Brain Fungus", "Corn", "Gourd", "Melon", "Silt Bean", "Tato", "InstaMash (Preserved)", "Salisbury Steak (Preserved)", "Food Paste", "Noodle Cup", "Corn (non-irradiated)", "BlamCo Brand Mac and Cheese (Preserved)", "Tarberry"].map((name) => item(name.replace(" (non-irradiated)", ""), "consumables", name)))
  },
  {
    key: "foraging", page: 202, formula: "1d20", names: { en: "Foraging", fr: "Cueillette" },
    results: [[1,1,"Brain Fungus"],[2,2,"Glowing Fungus"],[3,4,"Carrot"],[5,6,"Corn"],[7,8,"Gourd"],[9,10,"Melon"],[11,12,"Mutfruit"],[13,14,"Razorgrain"],[15,16,"Silt Bean"],[17,18,"Tato"],[19,19,"Hubflower"],[20,20,"Bloodleaf"]].map(([min,max,name])=>({range:[min,max],...item(name,"consumables")}))
  },
  {
    key: "random-beverages", page: 203, names: { en: "Random Beverages", fr: "Boissons aléatoires" },
    ...byTotal("2d20", ["Wine","Wine","Whiskey","Whiskey","Nuka-Cherry","Nuka-Cherry","Nuka-Cherry","Nuka-Cola","Nuka-Cola","Nuka-Cola","Bourbon","Bourbon","Bourbon","Blood Pack","Beer","Beer","Beer","Dirty Water","Dirty Water","Dirty Water","Dirty Water","Dirty Water","Purified Water","Purified Water","Purified Water","Blood Pack","Brahmin Milk","Brahmin Milk","Brahmin Milk","Rum","Rum","Rum","Moonshine","Moonshine","Moonshine","Vodka","Vodka","Wine","Wine"].map((name)=>item(name,"consumables")))
  },
  {
    key: "nuka-cola-machine", page: 203, formula: "1d20", names: { en: "Nuka-Cola Machine", fr: "Distributeur de Nuka-Cola" },
    results: [[1,8,text("Empty")],[9,12,text("1+2 CD glass bottles", "Junk; salvage each for 2 common materials.")],[13,15,item("Nuka-Cola","consumables","1 Nuka-Cola")],[16,17,item("Nuka-Cola","consumables","2 Nuka-Cola")],[18,18,text("1 Nuka-Cola, 1 Nuka-Cherry")],[19,19,text("2 Nuka-Cola, 1 Nuka-Cherry")],[20,20,item("Nuka-Cola Quantum","consumables","1 Nuka-Cola Quantum")]].map(([min,max,result])=>({range:[min,max],...result}))
  },
  {
    key: "random-chems", page: 204, names: { en: "Random Chems", fr: "Drogues aléatoires" },
    ...byTotal("2d20", ["Super Stimpak","Calmex","Day Tripper","Addictol","Stimpak","Stimpak","RadAway","RadAway","Psycho","Psycho","Med-X","Med-X","Daddy-O","Daddy-O","Rad-X (Diluted)","Rad-X (Diluted)","Healing Salve","Healing Salve","Dirty Water","Dirty Water","Dirty Water","Stimpak (Diluted)","Stimpak (Diluted)","RadAway (Diluted)","RadAway (Diluted)","Buffout","Buffout","Jet","Jet","Mentats","Mentats","Rad-X","Rad-X","Stimpak","Stimpak","Antibiotics","Overdrive","Fury","X-Cell"].map((name)=>item(name,"consumables")))
  },
  {
    key: "random-ranged-weapons", page: "204-205", names: { en: "Random Ranged Weapons", fr: "Armes à distance aléatoires" },
    ...byTotal("2d20", ["Fat Man","Fat Man","Missile Launcher","Missile Launcher","Railway Rifle","Junk Jet","Flamer","Plasma Pistol","Laser Rifle","Institute Laser Rifle (Long Barrel, Standard Stock)","Syringer","Hunting Rifle","Assault Rifle","Laser Musket","Submachine Gun","10mm Pistol","Pipe Bolt-Action","Laser Rifle","Pipe Rifle (Long Barrel, Standard Stock)","Pipe Gun","Auto Pipe Gun (Automatic Receiver)","Pipe Revolver","Pipe Bolt Action Rifle (Long Barrel, Standard Stock)","10mm Auto Pistol (Automatic Receiver)","Double-Barrel Shotgun",".44 Pistol","Combat Rifle","Scoped Hunting Rifle (Long Barrel, Short Scope)","Combat Shotgun","Institute Laser Pistol","Laser Pistol","Minigun","Plasma Rifle (Long Barrel, Standard Stock)","Gatling Laser","Gauss Rifle","Heavy Incinerator","Heavy Incinerator","Gamma Gun","Gamma Gun"].map((name)=>text(name)))
  },
  {
    key: "random-melee-weapons", page: 205, names: { en: "Random Melee Weapons", fr: "Armes de corps à corps aléatoires" },
    ...byTotal("2d20", ["Deathclaw Gauntlet","Shishkebab","Shishkebab","Sledgehammer","Sledgehammer","Ripper","Ripper","Boxing Glove","Boxing Glove","Baton","Baton","Machete","Machete","Walking Cane","Walking Cane","Pool Cue","Pool Cue","Switchblade","Switchblade","Board","Board","Lead Pipe","Lead Pipe","Rolling Pin","Rolling Pin","Pipe Wrench","Pipe Wrench","Knuckles","Knuckles","Tire Iron","Tire Iron","Sword","Sword","Aluminum Baseball Bat","Aluminum Baseball Bat","Power Fist","Power Fist","Super Sledge","Super Sledge"].map((name)=>item(name,"weapons")))
  },
  {
    key: "random-thrown-explosives", page: 206, names: { en: "Random Thrown and Explosive Weapons", fr: "Armes de lancer et explosifs aléatoires" },
    ...byTotal("2d20", ["1 Nuka Grenade","1 Pulse Mine","1 Pulse Mine","1 Plasma Mine","1 Plasma Mine","1 Bottlecap Mine","1 Bottlecap Mine","1 Bottlecap Mine","2+1 CD Frag Grenades","2+1 CD Frag Grenades","2+1 CD Frag Grenades","2+1 CD Molotov Cocktails","2+1 CD Molotov Cocktails","2+1 CD Javelins","2+1 CD Javelins","2+1 CD Javelins","2+1 CD Javelins","2+1 CD Javelins","4+2 CD Throwing Knives","4+2 CD Throwing Knives","4+2 CD Throwing Knives","2+1 CD Baseball Grenades","2+1 CD Baseball Grenades","2+1 CD Baseball Grenades","2+1 CD Baseball Grenades","2+1 CD Baseball Grenades","2+1 CD Molotov Cocktails","2+1 CD Molotov Cocktails","2+1 CD Tomahawks","2+1 CD Tomahawks","2+1 CD Tomahawks","1 Frag Mine","1 Frag Mine","1 Frag Mine","1 Plasma Grenade","1 Plasma Grenade","1 Pulse Grenade","1 Pulse Grenade","1 Nuke Mine"].map((label)=>{const name=label.replace(/^\d+(?:\+\d+ CD)? /,"").replace(/s$/,"");return item(name,"weapons",label)}))
  },
  {
    key: "random-oddities", page: "207-208", formula: "3d20", names: { en: "Random Oddities and Valuables", fr: "Curiosités et objets de valeur aléatoires" },
    results: [
      [3,"Regeneration Field"],[4,"Regeneration Field"],[5,"Pre-War Money worth 5d20 Caps"],[6,"Pre-War Money worth 5d20 Caps"],[7,"5d20 Caps"],[8,"5d20 Caps"],[9,"5d20 Caps"],[10,"Stealth Field"],[11,"Recon Sensors"],[12,"Diagnosis Mod"],[13,"Geiger Counter"],[14,"Doctor's Bag"],[15,"Magazine (see Random Publication)"],[16,"Pre-War Money worth 4d20 Caps"],[17,"4d20 Caps"],[18,"Container"],[19,"Hazard Detection Mod"],[20,"Radio"],[21,"Lock Pick Set"],[22,"Holotape Player"],[23,"Backpack, Large"],[24,"Pre-War Money worth 3d20 Caps"],[25,"3d20 Caps"],[26,"Integral Boiler Mod"],[27,"1+2 CD Signal Flares"],[28,"Pre-War Money worth 2d20 Caps"],[29,"2d20 Caps"],[30,"2+1 CD Bobby Pins"],[31,"1d20 Caps"],[32,"Pre-War Money worth 1d20 Caps"],[33,"4+2 CD Bobby Pins"],[34,"Backpack, Small"],[35,"Torch"],[36,"Note or Holotape"],[37,"6+3 CD Bobby Pins"],[38,"Robot Repair Kit"],[39,"First Aid Kit"],[40,"Lantern"],[41,"Multi-Tool"],[42,"Hacking Mod"],[43,"Lockpick Module"],[44,"Container, Locked"],[45,"8+4 CD Bobby Pins"],[46,"Stealth Boy"],[47,"Deluxe Toolkit"],[48,"Flashlight"],[49,"Behavioral Analysis Mod"],[50,"Radiation Coils"],[51,"Sensor Array"],[52,"Key"],[53,"Key"],[54,"Key"],[55,"10+5 CD Bobby Pins"],[56,"10+5 CD Bobby Pins"],[57,"10+5 CD Bobby Pins"],[58,"Stimpak Diffuser"],[59,"Stimpak Diffuser"],[60,"Tesla Coils"]
    ].map(([roll,name])=>({range:[roll,roll],...text(name)}))
  },
  {
    key: "random-diseases", page: 193, formula: "1d20", names: { en: "Random Diseases", fr: "Maladies aléatoires" },
    results: ["Blood Worms", "Bone Worms", "Buzz Brain", "Dysentery", "Fever Claw", "Flap Limb", "Glowing Pustules", "Heat Flashes", "Jelly Fingers", "Lock Joint", "Needle Spine", "Parasites", "Rad Worms", "Shell Shock", "Sludge Lung", "Snot Ear", "Swamp Gas", "Swamp Itch", "The Whoopsies", "Weeping Sores"].map((name,index)=>({range:[index+1,index+1],...item(name,"diseases")}))
  },
  {
    key: "vault-room-encounters", page: 257, formula: "1d20", names: { en: "Vault Room Encounters", fr: "Rencontres dans les salles d’Abri" },
    results: [
      {range:[1,1],name:"Disaster!",description:"The characters trigger a vault-wide calamity and must escape.",frName:"Catastrophe !",frDescription:"Les personnages déclenchent une catastrophe touchant tout l’Abri et doivent s’échapper."},
      {range:[2,3],name:"Faction Scouts",description:"7-12 human raiders on a faction mission. On 1d20: 1-5 friendly, 16-20 hostile, otherwise neutral or unknown.",frName:"Éclaireurs d’une faction",frDescription:"7 à 12 pillards humains en mission pour une faction. Sur 1d20 : 1-5 amicaux, 16-20 hostiles, sinon neutres ou inconnus."},
      {range:[4,5],name:"Mutant Gang",description:"2-4 mutants attack immediately. On 1d20, a 1-4 means at least one is a super mutant.",frName:"Bande de mutants",frDescription:"2 à 4 mutants attaquent immédiatement. Sur 1d20, un résultat de 1 à 4 indique la présence d’au moins un super mutant."},
      {range:[6,7],name:"Bots",description:"Vault-appropriate security robots patrol with orders to exterminate or capture intruders.",frName:"Robots",frDescription:"Des robots de sécurité adaptés à l’Abri patrouillent avec ordre d’exterminer ou de capturer les intrus."},
      {range:[8,10],name:"No Encounter",description:"The area is empty.",frName:"Aucune rencontre",frDescription:"La zone est vide."},
      {range:[11,13],name:"The Dead",description:"Signs of a battle. A suitable test uncovers clean water and good food for a number of days equal to the successes.",frName:"Les morts",frDescription:"Les traces d’une bataille. Un test approprié permet de trouver autant de jours d’eau pure et de nourriture saine que de réussites."},
      {range:[14,15],name:"Mole Rats",description:"Three times as numerous as the party, they swarm across the room biting everything.",frName:"Rats-taupes",frDescription:"Trois fois plus nombreux que les membres du groupe, ils envahissent la pièce en mordant tout ce qui bouge."},
      {range:[16,17],name:"Bugs!",description:"Giant radscorpions, giant ants, or mirelurks, in numbers equal to the party.",frName:"Des insectes !",frDescription:"Des radscorpions géants, fourmis géantes ou fangeux, aussi nombreux que les membres du groupe."},
      {range:[18,19],name:"Ghoul Pack",description:"2-4 feral ghouls attack. On 1d20, a 1-4 adds a roamer or Reaver.",frName:"Meute de goules",frDescription:"2 à 4 goules sauvages attaquent. Sur 1d20, un résultat de 1 à 4 ajoute un vagabond ou un écorcheur."},
      {range:[20,20],name:"Conflict!",description:"Roll twice; both results are locked in mortal combat and initially ignore the player characters.",frName:"Conflit !",frDescription:"Lancez deux fois ; les deux résultats s’affrontent à mort et ignorent initialement les personnages joueurs."}
    ]
  },
  {
    key: "vault-weird-quests", page: 257, formula: "1d20", names: { en: "Wacky Vault Quests", fr: "Quêtes insolites d’Abri" },
    results: [
      {range:[1,4],name:"Rampant AI",description:"A self-aware computer or robot forces the characters to help complete its programmed mission.",frName:"IA déchaînée",frDescription:"Un ordinateur ou robot conscient oblige les personnages à l’aider à accomplir sa mission programmée."},
      {range:[5,8],name:"Forgotten Tinkers",description:"Young descendants of brilliant engineers filled the vault with elaborate improvised devices.",frName:"Bricoleurs oubliés",frDescription:"De jeunes descendants d’ingénieurs brillants ont rempli l’Abri de dispositifs improvisés complexes."},
      {range:[9,12],name:"On the Record",description:"The vault is empty and immaculate; music still plays and movement is always heard in the next room.",frName:"Pour mémoire",frDescription:"L’Abri est vide et impeccable ; la musique joue encore et des mouvements semblent toujours venir de la pièce voisine."},
      {range:[13,16],name:"Experiment Continued",description:"A robotic Overseer wants new subjects for the vault’s supersoldier experiment.",frName:"L’expérience continue",frDescription:"Un Superviseur robotique veut de nouveaux sujets pour l’expérience de supersoldats de l’Abri."},
      {range:[17,20],name:"Mars Station",description:"A forgotten prototype vault simulates a Mars base, including altered gravity and outdoor VR.",frName:"Station martienne",frDescription:"Un prototype d’Abri oublié simule une base martienne, avec gravité altérée et réalité virtuelle extérieure."}
    ]
  },
  {
    key: "commonwealth-encounters", page: 308, formula: "1d20", names: { en: "Random Commonwealth Encounters", fr: "Rencontres aléatoires du Commonwealth" },
    results: [
      [1,2,"Raider Shanties","Raiders occupy shanty huts and shout demands.","Cabanes de pillards","Des pillards occupent des cabanes et crient leurs exigences."],
      [3,4,"Merchant and Bloatflies","A merchant flees bloatflies and rewards rescuers.","Marchand et mouches bouffies","Un marchand fuit des mouches bouffies et récompense ses sauveteurs."],
      [5,6,"Wandering Eyebot","An Eyebot broadcasts advertisements and possible mission information.","Eyebot vagabond","Un Eyebot diffuse des publicités et peut-être des informations de mission."],
      [7,8,"Feral Dogs","Hungry feral dogs attack.","Chiens sauvages","Des chiens sauvages affamés attaquent."],
      [9,10,"Yao Guai Ambush","A Yao Guai ambushes the group in its territory.","Embuscade de yao guai","Un yao guai attaque le groupe sur son territoire."],
      [11,12,"Feral Ghoul Pack","Feral ghouls charge with a glowing one at their center.","Meute de goules sauvages","Des goules sauvages chargent, menées par un luminescent."],
      [13,14,"Brotherhood Vertibird","A Brotherhood of Steel Vertibird reacts according to the group’s reputation.","Vertiptère de la Confrérie","Un Vertiptère de la Confrérie de l’Acier réagit selon la réputation du groupe."],
      [15,16,"Super Mutant Behemoth","A super mutant behemoth guards the current location.","Béhémoth super mutant","Un béhémoth super mutant garde le lieu."],
      [17,18,"Mirelurk Queen","A mirelurk queen and brood protect a spawning pool.","Reine fangeuse","Une reine fangeuse et sa couvée protègent un bassin de ponte."],
      [19,19,"Deathclaw Victor","One deathclaw stands over another it has killed.","Écorcheur victorieux","Un écorcheur se tient au-dessus d’un congénère qu’il vient de tuer."],
      [20,20,"Weird Wasteland","Roll on the Random Weird Wasteland Encounters table.","Terres désolées étranges","Lancez sur la table Rencontres étranges des Terres désolées."]
    ].map(([min,max,name,description,frName,frDescription])=>({range:[min,max],name,description,frName,frDescription}))
  },
  {
    key: "weird-wasteland-encounters", page: 308, formula: "1d20", names: { en: "Random Weird Wasteland Encounters", fr: "Rencontres étranges des Terres désolées" },
    results: [
      [1,3,"Mister Gutsy Exercise","Mister Gutsy robots on a mock exercise recruit the party as friendly or enemy soldiers.","Exercice de Mister Gutsy","Des robots Mister Gutsy en exercice recrutent le groupe comme soldats amis ou ennemis."],
      [4,7,"Pillars Cultists","Followers of the Pillars of the Community try to proselytize.","Sectateurs des Piliers","Des fidèles des Piliers de la Communauté tentent de convertir le groupe."],
      [8,10,"Pre-War Convention","Fans of many pre-War cultural icons organize a convention.","Convention d’avant-guerre","Des admirateurs de nombreuses icônes culturelles d’avant-guerre organisent une convention."],
      [11,14,"Super Mutant Engineers","Super mutants try to operate advanced technology such as an aircraft, robot, or tank.","Ingénieurs super mutants","Des super mutants tentent de faire fonctionner une technologie avancée : avion, robot ou char."],
      [15,17,"Wasteland Taxis","Settlers operating makeshift rickshaw taxis offer their services for caps.","Taxis des Terres désolées","Des colons conduisant des pousse-pousse improvisés proposent leurs services contre des capsules."],
      [18,20,"Unknown Vault Dweller","A dweller from an unknown vault asks for infrastructure parts.","Habitant d’un Abri inconnu","Un habitant d’un Abri inconnu demande des pièces pour son infrastructure."]
    ].map(([min,max,name,description,frName,frDescription])=>({range:[min,max],name,description,frName,frDescription}))
  }
];
