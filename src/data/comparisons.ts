export interface ComparisonTool {
  name: string
  slug: string
  tagline: string
  website: string
  pricing: {
    free: boolean
    startingPrice: string
    model: string
  }
  features: {
    realTimeSync: boolean
    customerFeedback: boolean
    publicViews: boolean
    passwordProtection: boolean
    customBranding: boolean
    roadmapViews: boolean
    apiAccess: boolean
    integrations: number
    teamSize: string
    customForms: boolean
    automation: boolean
  }
  pros: string[]
  cons: string[]
  bestFor: string[]
  founded: string
  description: string
}

export const comparisonTools: Record<string, ComparisonTool> = {
  steelsync: {
    name: 'SteelSync',
    slug: 'steelsync',
    tagline: 'Linear public boards and client collaboration',
    website: 'https://steelsync.io',
    pricing: {
      free: true,
      startingPrice: 'Free - Paid tiers',
      model: 'Per workspace'
    },
    features: {
      realTimeSync: true,
      customerFeedback: true,
      publicViews: true,
      passwordProtection: true,
      customBranding: true,
      roadmapViews: true,
      apiAccess: true,
      integrations: 5,
      teamSize: 'Unlimited',
      customForms: true,
      automation: true
    },
    pros: [
      'Native Linear integration',
      'Public/private board views',
      'AI-generated changelogs',
      'Slack integration',
      'Client request automation'
    ],
    cons: [
      'Paid features for advanced use',
      'Closed source',
      'Less transparent pricing'
    ],
    bestFor: [
      'Agencies needing public roadmaps',
      'Teams wanting AI changelogs',
      'Companies with client-facing needs'
    ],
    founded: '2022',
    description: 'SteelSync converts Linear data into public/private boards, enabling real-time stakeholder collaboration with features like AI changelogs and automated client requests.'
  },
  lindie: {
    name: 'Lindie',
    slug: 'lindie',
    tagline: "Linear's collaboration companion",
    website: 'https://lindie.app',
    pricing: {
      free: true,
      startingPrice: 'Free - Paid tiers',
      model: 'Freemium'
    },
    features: {
      realTimeSync: true,
      customerFeedback: true,
      publicViews: true,
      passwordProtection: true,
      customBranding: true,
      roadmapViews: false,
      apiAccess: false,
      integrations: 3,
      teamSize: 'Up to 10 on free',
      customForms: true,
      automation: true
    },
    pros: [
      'Free tier available',
      'Simple setup',
      'Good UI/UX',
      'Magic Summary feature',
      'Status change notifications'
    ],
    cons: [
      'Limited free tier',
      'No API access',
      'Feature restrictions on free plan',
      'Closed source'
    ],
    bestFor: [
      'Small teams and startups',
      'Agencies sharing Linear with clients',
      'Teams wanting private read-only links'
    ],
    founded: '2023',
    description: "Lindie is Linear's collaboration companion, helping teams share projects with stakeholders through shareable boards, client request forms, and automated status updates."
  }
}

export const linearGratis: ComparisonTool = {
  name: 'linear.gratis',
  slug: 'linear-gratis',
  tagline: 'Free Linear customer feedback forms',
  website: 'https://linear.gratis',
  pricing: {
    free: true,
    startingPrice: 'Free forever',
    model: 'Completely free'
  },
  features: {
    realTimeSync: true,
    customerFeedback: true,
    publicViews: true,
    passwordProtection: true,
    customBranding: true,
    roadmapViews: true,
    apiAccess: false,
    integrations: 1,
    teamSize: 'Unlimited',
    customForms: true,
    automation: true
  },
  pros: [
    'Completely free forever',
    'Open source',
    'Direct Linear integration',
    'No setup complexity',
    'Public views & roadmaps',
    'No user limits',
    'Password-protected views'
  ],
  cons: [
    'Single integration (Linear only)',
    'Community support only',
    'No AI-powered features'
  ],
  bestFor: [
    'Small teams and startups',
    'Budget-conscious teams',
    'Linear users wanting free customer feedback',
    'Open source advocates'
  ],
  founded: '2024',
  description: 'linear.gratis is a completely free, open source alternative to paid Linear feedback tools, offering unlimited customer feedback forms, public Linear views, and roadmaps.'
}