import { auth } from '@/lib/firebase'

// URL de base de tes fonctions (région europe-west1)
const FUNCTIONS_URL = 'https://europe-west1-aibusiness-ibm.cloudfunctions.net'

export const TOOL_COSTS = {
  chat:          1,
  business_plan: 5,
  marketing:     3,
  rapport:       4,
  planner:       2,
  cv_generator:  2,
  presentation:  4,
  word_doc:      3,
  default:       1,
}

export async function askClaude({
  system,
  prompt,
  tool = 'default',
  maxTokens = 2000,
}) {
  // 1. Récupérer le jeton de l'utilisateur connecté pour prouver son identité
  const token = await auth.currentUser?.getIdToken()

  if (!token) throw new Error('Utilisateur non connecté')

  // 2. Appeler la Firebase Function au lieu de l'API Anthropic directement
  const res = await fetch(`${FUNCTIONS_URL}/askClaude`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`, // Sécurité : on envoie le token
    },
    body: JSON.stringify({ system, prompt, tool, maxTokens }),
  })

  const data = await res.json()

  if (!res.ok) throw new Error(data.error || 'Erreur lors de la réponse de Claude')

  // 3. Retourner le texte généré par ta fonction backend
  return data.result
}