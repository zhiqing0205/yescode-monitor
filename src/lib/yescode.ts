export interface YesCodeUser {
  id: number
  username: string
  email: string
  api_key: string
  subscription_balance: number
  pay_as_you_go_balance: number
  balance: number
  subscription_plan_id: number
  subscription_plan: {
    id: number
    name: string
    description: string
    plan_type: string
    price: number
    daily_balance: number
    monthly_spend_limit: number
    initial_balance: number
    stock: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
  subscription_expiry: string
  preferred_provider_id: number
  email_verified: boolean
  oauth_id: string | null
  current_month_spend: number
  last_month_reset: string
  last_daily_balance_add: string
  referral_code: string
  referred_by_user_id: number | null
  total_referral_earnings: number
  created_at: string
  updated_at: string
}

export async function fetchYesCodeUserInfo(): Promise<YesCodeUser> {
  console.log('Calling YesCode API...')
  
  if (!process.env.YESCODE_JWT_TOKEN) {
    throw new Error('YESCODE_JWT_TOKEN environment variable is not set')
  }
  
  try {
    const response = await fetch('https://co.yes.vg/api/v1/auth/profile', {
      headers: {
        'Authorization': `Bearer ${process.env.YESCODE_JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('YesCode API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('YesCode API error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
    }

    const data = await response.json()
    console.log('YesCode API response received successfully')
    return data
  } catch (error) {
    console.error('Error in fetchYesCodeUserInfo:', error)
    if (error instanceof Error) {
      throw new Error(`Failed to fetch YesCode user info: ${error.message}`)
    }
    throw new Error('Failed to fetch YesCode user info: Unknown error')
  }
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