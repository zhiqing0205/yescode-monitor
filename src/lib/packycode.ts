export interface PackyCodeUser {
  user_id: string
  username: string
  email: string
  user_type: string
  balance_usd: string
  total_spent_usd: string
  api_key: string
  created_at: string
  plan_type: string
  plan_expires_at: string
  monthly_budget_usd: string
  daily_budget_usd: string
  daily_spent_usd: string
  monthly_spent_usd: string
  total_quota: number
  used_quota: number
  remaining_quota: number
}

export async function fetchPackyCodeUserInfo(): Promise<PackyCodeUser> {
  const response = await fetch('https://www.packycode.com/api/backend/users/info', {
    headers: {
      'Authorization': `Bearer ${process.env.PACKYCODE_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function sendBarkNotification(title: string, body: string, group?: string) {
  if (!process.env.BARK_URL) return

  try {
    const url = new URL(process.env.BARK_URL)
    url.pathname += `/${encodeURIComponent(title)}/${encodeURIComponent(body)}`
    
    if (group) {
      url.searchParams.append('group', group)
    }

    await fetch(url.toString(), { method: 'POST' })
  } catch (error) {
    console.error('Failed to send Bark notification:', error)
  }
}