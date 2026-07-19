import type { ManagedCategory } from '~/types'

/**
 * Construit le prompt à coller dans une IA (ChatGPT, Claude…) avec son relevé
 * de compte en pièce jointe. L'IA renvoie un JSON que l'app sait ré-importer.
 *
 * Le prompt contient :
 *  - la liste exacte des catégories de l'utilisateur (format "Parent > Sous-catégorie")
 *    pour que l'IA mappe sur l'existant plutôt que d'inventer ;
 *  - le schéma JSON de retour attendu ;
 *  - les règles (signe du montant, type, date ISO, score de confiance).
 */
export function buildAiImportPrompt(categories: ManagedCategory[], locale: 'fr' | 'en' = 'fr'): string {
  const lines: string[] = []
  for (const cat of categories) {
    if (cat.subcategories.length === 0) {
      lines.push(`- ${cat.name}`)
    } else {
      for (const sub of cat.subcategories) {
        lines.push(`- ${cat.name} > ${sub.name}`)
      }
    }
  }
  const categoryList = lines.join('\n')

  if (locale === 'en') {
    return `You are helping me import my bank statement into my personal finance app.

The bank statement is attached (PDF, image or text).

Here are MY categories — you MUST map each transaction to one of these exactly as written, using the "Parent > Subcategory" format. Never invent a category: if none fits, leave "category" empty and set a low confidence.

${categoryList}

For EACH transaction in the statement, return an object with:
- "date": the date in "YYYY-MM-DD" format
- "name": a short, clean label (remove bank prefixes like "CARD 01/02")
- "amount": a SIGNED number — negative for expenses, positive for income (e.g. -13.99 or 2500)
- "type": either "depense" (expense) or "revenu" (income)
- "category": the matching category as "Parent > Subcategory", or "" if none fits
- "confidence": a number between 0 and 1 reflecting how sure you are of the category (be honest)

Reply with ONLY valid JSON, no prose, no markdown fences, in this exact shape:

{
  "transactions": [
    { "date": "2026-01-15", "name": "Netflix", "amount": -13.99, "type": "depense", "category": "Subscriptions > Streaming", "confidence": 0.95 }
  ]
}`
  }

  return `Tu m'aides à importer mon relevé de compte dans mon application de finances personnelles.

Le relevé de compte est en pièce jointe (PDF, image ou texte).

Voici MES catégories — tu DOIS associer chaque transaction à l'une d'elles, exactement telle qu'écrite, au format "Parent > Sous-catégorie". N'invente jamais de catégorie : si aucune ne convient, laisse "category" vide et mets une confiance basse.

${categoryList}

Pour CHAQUE transaction du relevé, renvoie un objet avec :
- "date" : la date au format "YYYY-MM-DD"
- "name" : un libellé court et propre (retire les préfixes bancaires type "CARTE 01/02")
- "amount" : un nombre SIGNÉ — négatif pour une dépense, positif pour un revenu (ex : -13.99 ou 2500)
- "type" : soit "depense", soit "revenu"
- "category" : la catégorie correspondante au format "Parent > Sous-catégorie", ou "" si aucune ne convient
- "confidence" : un nombre entre 0 et 1 reflétant ta certitude sur la catégorie (sois honnête)

Réponds UNIQUEMENT avec du JSON valide, sans texte autour, sans balises markdown, dans ce format exact :

{
  "transactions": [
    { "date": "2026-01-15", "name": "Netflix", "amount": -13.99, "type": "depense", "category": "Abonnements > Streaming", "confidence": 0.95 }
  ]
}`
}
