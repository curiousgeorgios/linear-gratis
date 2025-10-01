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
    issueTracking: boolean
    customerFeedback: boolean
    publicViews: boolean
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
    tagline: 'Linear customer feedback integration',
    website: 'https://steelsync.co',
    pricing: {
      free: false,
      startingPrice: '$29/month',
      model: 'Per workspace'
    },
    features: {
      issueTracking: true,
      customerFeedback: true,
      publicViews: false,
      apiAccess: true,
      integrations: 5,
      teamSize: 'Unlimited',
      customForms: true,
      automation: true
    },
    pros: [
      'Native Linear integration',
      'Good customer support',
      'Automated workflows',
      'Slack integration'
    ],
    cons: [
      'Expensive for small teams',
      'Limited customisation',
      'No free tier',
      'Complex setup process'
    ],
    bestFor: [
      'Enterprise teams',
      'Companies with budget for tools',
      'Teams needing advanced automation'
    ],
    founded: '2022',
    description: 'SteelSync is a paid Linear integration focused on customer feedback collection with automated workflows and Slack integration.'
  },
  lindie: {
    name: 'Lindie',
    slug: 'lindie',
    tagline: 'Linear external feedback forms',
    website: 'https://lindie.io',
    pricing: {
      free: true,
      startingPrice: 'Free - $99/month',
      model: 'Freemium'
    },
    features: {
      issueTracking: true,
      customerFeedback: true,
      publicViews: true,
      apiAccess: false,
      integrations: 3,
      teamSize: 'Up to 10 on free',
      customForms: true,
      automation: false
    },
    pros: [
      'Free tier available',
      'Simple setup',
      'Good UI/UX',
      'Public Linear views'
    ],
    cons: [
      'Limited free tier',
      'No API access',
      'Basic automation',
      'Feature restrictions on free plan'
    ],
    bestFor: [
      'Small teams',
      'Startups',
      'Teams wanting public Linear views'
    ],
    founded: '2023',
    description: 'Lindie offers Linear feedback forms with a freemium model, providing public Linear views and basic customer feedback collection.'
  },
  canny: {
    name: 'Canny',
    slug: 'canny',
    tagline: 'Feature request management platform',
    website: 'https://canny.io',
    pricing: {
      free: true,
      startingPrice: 'Free - $360/month',
      model: 'Freemium'
    },
    features: {
      issueTracking: false,
      customerFeedback: true,
      publicViews: true,
      apiAccess: true,
      integrations: 20,
      teamSize: 'Unlimited',
      customForms: true,
      automation: true
    },
    pros: [
      'Comprehensive feature request management',
      'Great public roadmaps',
      'Strong integrations',
      'Good free tier'
    ],
    cons: [
      'Not a Linear integration',
      'Different workflow than Linear',
      'Can be complex for simple needs',
      'Expensive for larger teams'
    ],
    bestFor: [
      'Product managers',
      'Teams managing feature requests',
      'Companies needing public roadmaps'
    ],
    founded: '2017',
    description: 'Canny is a comprehensive feature request management platform with public roadmaps, though not directly integrated with Linear.'
  },
  uservoice: {
    name: 'UserVoice',
    slug: 'uservoice',
    tagline: 'Customer feedback platform',
    website: 'https://uservoice.com',
    pricing: {
      free: false,
      startingPrice: '$699/month',
      model: 'Enterprise'
    },
    features: {
      issueTracking: false,
      customerFeedback: true,
      publicViews: true,
      apiAccess: true,
      integrations: 15,
      teamSize: 'Unlimited',
      customForms: true,
      automation: true
    },
    pros: [
      'Enterprise-grade features',
      'Advanced analytics',
      'White-label options',
      'Comprehensive customer feedback tools'
    ],
    cons: [
      'Very expensive',
      'Overkill for small teams',
      'No Linear integration',
      'Complex setup'
    ],
    bestFor: [
      'Large enterprises',
      'Companies with dedicated product teams',
      'Enterprise customer feedback programmes'
    ],
    founded: '2008',
    description: 'UserVoice is an enterprise-focused customer feedback platform with advanced features but no direct Linear integration.'
  },
  productboard: {
    name: 'Productboard',
    slug: 'productboard',
    tagline: 'Product management platform',
    website: 'https://productboard.com',
    pricing: {
      free: false,
      startingPrice: '$25/month',
      model: 'Per user'
    },
    features: {
      issueTracking: false,
      customerFeedback: true,
      publicViews: false,
      apiAccess: true,
      integrations: 25,
      teamSize: 'Unlimited',
      customForms: true,
      automation: true
    },
    pros: [
      'Comprehensive product management',
      'Great feedback prioritisation',
      'Strong roadmapping features',
      'Good integrations'
    ],
    cons: [
      'Expensive per user',
      'No Linear integration',
      'Complex for simple feedback collection',
      'Learning curve'
    ],
    bestFor: [
      'Product managers',
      'Teams needing roadmap management',
      'Companies with complex product requirements'
    ],
    founded: '2014',
    description: 'Productboard is a comprehensive product management platform focused on feedback prioritisation and roadmapping, without Linear integration.'
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
    issueTracking: true,
    customerFeedback: true,
    publicViews: true,
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
    'Public Linear views',
    'No user limits'
  ],
  cons: [
    'Single integration (Linear only)',
    'Basic automation compared to enterprise tools',
    'Community support'
  ],
  bestFor: [
    'Small teams and startups',
    'Budget-conscious teams',
    'Linear users wanting free customer feedback',
    'Open source advocates'
  ],
  founded: '2024',
  description: 'linear.gratis is a completely free, open source alternative to paid Linear feedback tools, offering unlimited customer feedback forms and public Linear views.'
}