import {
  // Maison
  Home, Sofa, Bed, Bath, Wrench, Hammer, Lightbulb, Trash2, Key, Wind,
  // Transport
  Car, Bus, Train, Plane, Bike, Fuel, Ship, Truck, Navigation, ParkingSquare,
  // Alimentation
  Utensils, Coffee, Pizza, Apple, Beer, Wine, Sandwich, IceCream, Cake, Cookie, ChefHat,
  // Shopping & style
  ShoppingCart, ShoppingBag, Shirt, Scissors, Watch, Gem, Tag, Glasses,
  // Santé & sport
  Heart, Dumbbell, Activity, Stethoscope, Pill, Baby, Syringe,
  // Loisirs & culture
  Tv, Music, Gamepad2, BookOpen, Camera, Ticket, Film, Headphones, Mic, Palette,
  // Voyage & outdoor
  Globe, Compass, Backpack, Tent, Map, Hotel, Trees, Sunset,
  // Finance
  Wallet, CreditCard, PiggyBank, TrendingUp, Banknote, Receipt, Landmark, Coins,
  // Travail & tech
  Briefcase, Laptop, Building2, Phone, Mail, Printer, Monitor, Folder, Code, Cpu,
  // Divers
  Gift, Package, Zap, Droplets, GraduationCap, Leaf, Sun, Moon, Star, Bell,
  Flower2, Dog, Cat, Bird, Smile, Users,
} from 'lucide-vue-next'
import type { Component } from 'vue'

export const ICON_REGISTRY: Record<string, Component> = {
  // Maison
  'home':        Home,
  'sofa':        Sofa,
  'bed':         Bed,
  'bath':        Bath,
  'wrench':      Wrench,
  'hammer':      Hammer,
  'lightbulb':   Lightbulb,
  'trash':       Trash2,
  'key':         Key,
  'wind':        Wind,

  // Transport
  'car':         Car,
  'bus':         Bus,
  'train':       Train,
  'plane':       Plane,
  'bike':        Bike,
  'fuel':        Fuel,
  'ship':        Ship,
  'truck':       Truck,
  'navigation':  Navigation,
  'parking':     ParkingSquare,

  // Alimentation
  'utensils':    Utensils,
  'coffee':      Coffee,
  'pizza':       Pizza,
  'apple':       Apple,
  'beer':        Beer,
  'wine':        Wine,
  'sandwich':    Sandwich,
  'ice-cream':   IceCream,
  'cake':        Cake,
  'cookie':      Cookie,
  'chef-hat':    ChefHat,

  // Shopping & style
  'shopping-cart': ShoppingCart,
  'shopping-bag':  ShoppingBag,
  'shirt':         Shirt,
  'scissors':      Scissors,
  'watch':         Watch,
  'gem':           Gem,
  'tag':           Tag,
  'glasses':       Glasses,

  // Santé & sport
  'heart':         Heart,
  'dumbbell':      Dumbbell,
  'activity':      Activity,
  'stethoscope':   Stethoscope,
  'pill':          Pill,
  'baby':          Baby,
  'syringe':       Syringe,

  // Loisirs & culture
  'tv':            Tv,
  'music':         Music,
  'gamepad':       Gamepad2,
  'book':          BookOpen,
  'camera':        Camera,
  'ticket':        Ticket,
  'film':          Film,
  'headphones':    Headphones,
  'mic':           Mic,
  'palette':       Palette,

  // Voyage & outdoor
  'globe':         Globe,
  'compass':       Compass,
  'backpack':      Backpack,
  'tent':          Tent,
  'map':           Map,
  'hotel':         Hotel,
  'trees':         Trees,
  'sunset':        Sunset,

  // Finance
  'wallet':        Wallet,
  'credit-card':   CreditCard,
  'piggy-bank':    PiggyBank,
  'trending-up':   TrendingUp,
  'banknote':      Banknote,
  'receipt':       Receipt,
  'landmark':      Landmark,
  'coins':         Coins,

  // Travail & tech
  'briefcase':     Briefcase,
  'laptop':        Laptop,
  'building':      Building2,
  'phone':         Phone,
  'mail':          Mail,
  'printer':       Printer,
  'monitor':       Monitor,
  'folder':        Folder,
  'code':          Code,
  'cpu':           Cpu,

  // Divers
  'gift':          Gift,
  'package':       Package,
  'zap':           Zap,
  'droplets':      Droplets,
  'graduation-cap': GraduationCap,
  'leaf':          Leaf,
  'sun':           Sun,
  'moon':          Moon,
  'star':          Star,
  'bell':          Bell,
  'flower':        Flower2,
  'dog':           Dog,
  'cat':           Cat,
  'bird':          Bird,
  'smile':         Smile,
  'users':         Users,
}

export const ICON_KEYS = Object.keys(ICON_REGISTRY)

export function getIcon(key: string): Component {
  return ICON_REGISTRY[key] ?? ICON_REGISTRY['package']
}

// ─── Groupes ─────────────────────────────────────────────────────────────────

export interface IconGroup {
  label: string
  keys:  string[]
}

// Mots-clés français pour la recherche (key → termes séparés par espace)
export const ICON_SEARCH_TERMS: Record<string, string> = {
  'home':           'maison logement habitation',
  'sofa':           'canapé salon meuble',
  'bed':            'lit chambre sommeil',
  'bath':           'bain salle de bain douche',
  'wrench':         'bricolage réparation outil clé',
  'hammer':         'marteau bricolage outil',
  'lightbulb':      'ampoule électricité lumière énergie',
  'trash':          'poubelle déchets ordures',
  'key':            'clé serrure accès',
  'wind':           'vent air climatisation chauffage',
  'car':            'voiture auto véhicule transport',
  'bus':            'bus transport commun trajet',
  'train':          'train métro transport rail',
  'plane':          'avion vol voyage air',
  'bike':           'vélo cyclisme sport',
  'fuel':           'essence carburant station',
  'ship':           'bateau navire ferry',
  'truck':          'camion livraison transport',
  'navigation':     'navigation gps itinéraire',
  'parking':        'parking stationnement',
  'utensils':       'fourchette restaurant repas manger nourriture',
  'coffee':         'café boisson pause',
  'pizza':          'pizza fast food repas',
  'apple':          'pomme fruit alimentation santé',
  'beer':           'bière alcool bar',
  'wine':           'vin alcool restaurant',
  'sandwich':       'sandwich repas midi déjeuner',
  'ice-cream':      'glace dessert sucré',
  'cake':           'gâteau dessert anniversaire pâtisserie',
  'cookie':         'biscuit gâteau sec',
  'chef-hat':       'cuisine chef restaurant traiteur',
  'shopping-cart':  'courses supermarché achat panier',
  'shopping-bag':   'shopping sac achat boutique',
  'shirt':          'vêtement habillement mode',
  'scissors':       'ciseaux coiffeur couture',
  'watch':          'montre bijou accessoire',
  'gem':            'bijou luxe diamant',
  'tag':            'étiquette prix promotion',
  'glasses':        'lunettes optique vue',
  'heart':          'santé médecin cœur bien-être',
  'dumbbell':       'sport musculation gym fitness',
  'activity':       'activité sport santé forme',
  'stethoscope':    'médecin docteur médical santé',
  'pill':           'médicament pharmacie santé',
  'baby':           'bébé enfant famille',
  'syringe':        'vaccin médical injection',
  'tv':             'télévision streaming abonnement',
  'music':          'musique concert streaming',
  'gamepad':        'jeu vidéo gaming console',
  'book':           'livre lecture culture',
  'camera':         'photo appareil photo',
  'ticket':         'billet spectacle cinéma concert',
  'film':           'cinéma film vidéo',
  'headphones':     'casque audio musique podcast',
  'mic':            'micro podcast enregistrement',
  'palette':        'art peinture création hobby',
  'globe':          'monde international voyage',
  'compass':        'boussole exploration randonnée',
  'backpack':       'sac à dos randonnée voyage',
  'tent':           'tente camping outdoor',
  'map':            'carte plan itinéraire',
  'hotel':          'hôtel hébergement nuit',
  'trees':          'arbres forêt nature',
  'sunset':         'coucher soleil nature vacances',
  'wallet':         'portefeuille argent budget',
  'credit-card':    'carte bancaire paiement',
  'piggy-bank':     'épargne économies tirelire',
  'trending-up':    'investissement hausse revenus',
  'banknote':       'billet argent cash espèces',
  'receipt':        'reçu facture dépense',
  'landmark':       'banque institution impôts',
  'coins':          'monnaie pièces argent liquide',
  'briefcase':      'travail bureau professionnel',
  'laptop':         'ordinateur télétravail tech',
  'building':       'bureau entreprise immeuble',
  'phone':          'téléphone mobile abonnement',
  'mail':           'email courrier poste',
  'printer':        'imprimante bureau fournitures',
  'monitor':        'écran ordinateur bureau',
  'folder':         'dossier fichier documents',
  'code':           'code développement informatique',
  'cpu':            'processeur tech matériel',
  'gift':           'cadeau anniversaire fête',
  'package':        'colis livraison divers',
  'zap':            'énergie électricité éclair',
  'droplets':       'eau abonnement pluie',
  'graduation-cap': 'études école formation diplôme',
  'leaf':           'nature environnement bio',
  'sun':            'soleil météo vacances été',
  'moon':           'lune nuit sommeil',
  'star':           'étoile favori notable',
  'bell':           'alarme notification abonnement',
  'flower':         'fleur jardin nature',
  'dog':            'chien animaux animal vétérinaire',
  'cat':            'chat animaux animal vétérinaire',
  'bird':           'oiseau animaux nature',
  'smile':          'loisir plaisir bien-être',
  'users':          'famille amis social groupe',
}

export const ICON_GROUPS: IconGroup[] = [
  {
    label: 'Maison & quotidien',
    keys:  ['home', 'sofa', 'bed', 'bath', 'wrench', 'hammer', 'lightbulb', 'trash', 'key', 'wind'],
  },
  {
    label: 'Transport',
    keys:  ['car', 'bus', 'train', 'plane', 'bike', 'fuel', 'ship', 'truck', 'navigation', 'parking'],
  },
  {
    label: 'Alimentation',
    keys:  ['utensils', 'coffee', 'pizza', 'apple', 'beer', 'wine', 'sandwich', 'ice-cream', 'cake', 'cookie', 'chef-hat'],
  },
  {
    label: 'Shopping & mode',
    keys:  ['shopping-cart', 'shopping-bag', 'shirt', 'scissors', 'watch', 'gem', 'tag', 'glasses'],
  },
  {
    label: 'Santé & sport',
    keys:  ['heart', 'dumbbell', 'activity', 'stethoscope', 'pill', 'baby', 'syringe'],
  },
  {
    label: 'Loisirs & culture',
    keys:  ['tv', 'music', 'gamepad', 'book', 'camera', 'ticket', 'film', 'headphones', 'mic', 'palette'],
  },
  {
    label: 'Voyage & nature',
    keys:  ['globe', 'compass', 'backpack', 'tent', 'map', 'hotel', 'trees', 'sunset'],
  },
  {
    label: 'Finance',
    keys:  ['wallet', 'credit-card', 'piggy-bank', 'trending-up', 'banknote', 'receipt', 'landmark', 'coins'],
  },
  {
    label: 'Travail & tech',
    keys:  ['briefcase', 'laptop', 'building', 'phone', 'mail', 'printer', 'monitor', 'folder', 'code', 'cpu'],
  },
  {
    label: 'Divers',
    keys:  ['gift', 'package', 'zap', 'droplets', 'graduation-cap', 'leaf', 'sun', 'moon', 'star', 'bell', 'flower', 'dog', 'cat', 'bird', 'smile', 'users'],
  },
]
