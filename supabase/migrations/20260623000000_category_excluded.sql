-- Ajoute un flag « exclu des calculs » au niveau de la catégorie.
--
-- Cas d'usage : la désépargne (virement qui SORT du Livret vers le compte
-- courant). Ces montants arrivent en positif et seraient comptés comme un
-- revenu — ce qui masquerait un dépassement de budget sur la jauge. Une
-- catégorie marquée `excluded` reste affichée (dans les cartes, le détail et
-- la barre de revenus, en rouge), mais ses transactions sont retirées de la
-- jauge, du budget de référence, du prévisionnel et du score du mois. Elles
-- restent en revanche comptées dans le solde RÉEL (l'argent est bien arrivé).
--
-- Réglage purement front : aucune fonction de stats n'a besoin d'être modifiée,
-- le filtrage se fait côté client à partir de cette colonne.
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT false;
