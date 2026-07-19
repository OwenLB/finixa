import type { SupabaseClient } from '@supabase/supabase-js'

export async function getSessionUserId(client: SupabaseClient): Promise<string> {
  // getSession() lit le JWT en mémoire/stockage local (aucun aller-retour
  // réseau, contrairement à getUser()) — c'est le chemin chaud de chaque
  // insertion (ajout de dépense, favori, catégorie…).
  const { data: { session } } = await client.auth.getSession()
  if (!session?.user) throw new Error('Non authentifié')
  return session.user.id
}

/**
 * Déconnexion avec rechargement complet de l'app.
 *
 * Le reload est indispensable : les stores Pinia (transactions, catégories,
 * favoris, préférences…) gardent sinon en mémoire les données financières du
 * compte précédent, qui s'afficheraient au prochain utilisateur sur le même
 * appareil. Le hash est posé avant le reload (router en hashMode — un chemin
 * réel /login ferait un 404 sur hébergement statique).
 */
export async function signOutAndReload(client: SupabaseClient): Promise<void> {
  await client.auth.signOut()
  window.location.hash = '#/login'
  window.location.reload()
}
