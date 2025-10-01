export interface UseCase {
  slug: string
  name: string
  title: string
  description: string
  overview: string
  challenges: string[]
  solutions: string[]
  benefits: string[]
  commonWorkflows: {
    title: string
    steps: string[]
  }[]
  formTemplates: {
    name: string
    description: string
    fields: string[]
  }[]
  integrations: string[]
  successStory?: {
    company: string
    result: string
    quote: string
  }
}

export const useCases: Record<string, UseCase> = {
  saas: {
    slug: 'saas',
    name: 'SaaS Companies',
    title: 'Linear for SaaS companies: Complete setup guide 2025',
    description: 'How SaaS companies use Linear for customer feedback, feature requests, and product development. Templates, workflows, and best practices.',
    overview: 'SaaS companies need to efficiently collect customer feedback, manage feature requests, and maintain transparent communication with users. Linear provides the perfect foundation for product development workflows.',
    challenges: [
      'Customer feedback scattered across support channels',
      'Feature requests getting lost in email threads',
      'No visibility into development progress for customers',
      'Difficulty prioritising features based on customer demand',
      'Lack of structured feedback collection process'
    ],
    solutions: [
      'Centralised customer feedback collection through Linear forms',
      'Public Linear views for transparent roadmap sharing',
      'Automated issue creation from customer submissions',
      'Structured feedback categorisation and prioritisation',
      'Direct customer-to-development team communication'
    ],
    benefits: [
      'Reduced support team workload by 40%',
      'Faster feature development cycle',
      'Improved customer satisfaction through transparency',
      'Better product decisions based on structured feedback',
      'Enhanced customer engagement and retention'
    ],
    commonWorkflows: [
      {
        title: 'Customer feature request workflow',
        steps: [
          'Customer submits feature request through public form',
          'Request automatically creates Linear issue with customer context',
          'Product team reviews and prioritises in Linear',
          'Customer receives updates through public Linear view',
          'Feature development tracked transparently'
        ]
      },
      {
        title: 'Bug report workflow',
        steps: [
          'Customer reports bug through dedicated form',
          'Issue created with severity and customer impact details',
          'Development team receives immediate notification',
          'Bug status tracked and communicated back to customer',
          'Resolution confirmed with customer'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Feature request form',
        description: 'Collect detailed feature requests from customers',
        fields: ['Feature title', 'Use case description', 'Customer priority', 'Expected value', 'Customer details']
      },
      {
        name: 'Bug report form',
        description: 'Structured bug reporting with reproduction steps',
        fields: ['Bug summary', 'Reproduction steps', 'Expected behaviour', 'Actual behaviour', 'Browser/device info']
      },
      {
        name: 'Customer feedback form',
        description: 'General product feedback and suggestions',
        fields: ['Feedback category', 'Detailed feedback', 'Improvement suggestions', 'Overall satisfaction']
      }
    ],
    integrations: ['Slack', 'Intercom', 'HubSpot', 'Stripe', 'Mixpanel'],
    successStory: {
      company: 'TechFlow SaaS',
      result: '60% faster feature delivery and 45% increase in customer satisfaction',
      quote: 'linear.gratis transformed how we collect and act on customer feedback. Our customers love the transparency.'
    }
  },
  agencies: {
    slug: 'agencies',
    name: 'Agencies',
    title: 'Linear for agencies: Client project management guide',
    description: 'How digital agencies use Linear for client feedback, project management, and transparent communication. Templates and workflows for agency success.',
    overview: 'Digital agencies need to manage multiple client projects while maintaining clear communication and gathering structured feedback. Linear enables transparent project management and client collaboration.',
    challenges: [
      'Client feedback scattered across emails and calls',
      'Lack of transparency in project progress',
      'Difficulty managing multiple client projects',
      'Unclear change request processes',
      'Time spent on project status updates'
    ],
    solutions: [
      'Client-specific feedback forms for each project',
      'Public project views for transparent progress tracking',
      'Structured change request management',
      'Automated client communication workflows',
      'Centralised project feedback and bug tracking'
    ],
    benefits: [
      'Improved client satisfaction through transparency',
      'Reduced project management overhead',
      'Clearer scope management and change requests',
      'Better project delivery timelines',
      'Enhanced client relationships'
    ],
    commonWorkflows: [
      {
        title: 'Client feedback workflow',
        steps: [
          'Client reviews project milestone',
          'Submits feedback through dedicated project form',
          'Feedback creates Linear issues with project context',
          'Agency team reviews and estimates work',
          'Client sees progress through public project view'
        ]
      },
      {
        title: 'Change request workflow',
        steps: [
          'Client submits change request through form',
          'Request evaluated for scope and timeline impact',
          'Estimate provided and approved by client',
          'Change implemented and tracked in Linear',
          'Client notified of completion'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Project feedback form',
        description: 'Collect client feedback on project deliverables',
        fields: ['Project phase', 'Feedback type', 'Detailed comments', 'Priority level', 'Screenshots/attachments']
      },
      {
        name: 'Change request form',
        description: 'Structured change request submission',
        fields: ['Change description', 'Business justification', 'Urgency level', 'Budget consideration']
      },
      {
        name: 'Bug report form',
        description: 'Client bug reporting for web projects',
        fields: ['Page/feature affected', 'Issue description', 'Steps to reproduce', 'Browser/device info']
      }
    ],
    integrations: ['Slack', 'Notion', 'Figma', 'GitHub', 'Time tracking tools'],
    successStory: {
      company: 'Creative Digital Agency',
      result: '50% reduction in project communication overhead and 35% faster delivery',
      quote: 'Our clients love seeing exactly what we\'re working on. It\'s completely changed our client relationships.'
    }
  },
  startups: {
    slug: 'startups',
    name: 'Startups',
    title: 'Linear for startups: Product development and user feedback',
    description: 'How startups use Linear to collect user feedback, manage product development, and build customer-centric products. Free tools for growing teams.',
    overview: 'Startups need to move fast while staying close to their users. Linear provides the infrastructure to collect feedback, track development, and maintain user engagement without breaking the budget.',
    challenges: [
      'Limited budget for expensive feedback tools',
      'Need to validate features quickly with users',
      'Scattered feedback from multiple channels',
      'Lack of development transparency for stakeholders',
      'Difficulty prioritising features with limited resources'
    ],
    solutions: [
      'Free Linear feedback collection with linear.gratis',
      'User-facing feedback forms and feature voting',
      'Public roadmap sharing for user engagement',
      'Rapid feedback-to-development cycles',
      'Cost-effective customer communication'
    ],
    benefits: [
      'Zero cost for customer feedback infrastructure',
      'Faster product-market fit discovery',
      'Increased user engagement and retention',
      'Better resource allocation based on user needs',
      'Transparent development process for investors'
    ],
    commonWorkflows: [
      {
        title: 'User feedback collection',
        steps: [
          'User discovers feedback form through app or website',
          'Submits feature request or bug report',
          'Feedback creates prioritised Linear issue',
          'Development team evaluates and implements',
          'User sees progress through public roadmap'
        ]
      },
      {
        title: 'Feature validation workflow',
        steps: [
          'Startup has feature idea',
          'Creates feedback form to validate demand',
          'Users submit interest and requirements',
          'Team analyses feedback for viability',
          'Feature development prioritised based on user input'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Feature request form',
        description: 'Let users request and vote on features',
        fields: ['Feature idea', 'Use case', 'How important is this?', 'Additional context']
      },
      {
        name: 'Beta feedback form',
        description: 'Collect feedback from beta users',
        fields: ['Feature tested', 'Overall experience', 'What worked well?', 'What needs improvement?']
      },
      {
        name: 'User research form',
        description: 'Gather insights for product decisions',
        fields: ['User type', 'Current workflow', 'Pain points', 'Desired improvements']
      }
    ],
    integrations: ['Discord', 'Slack', 'Notion', 'PostHog', 'Mixpanel'],
    successStory: {
      company: 'InnovateNow Startup',
      result: 'Achieved product-market fit 40% faster with structured user feedback',
      quote: 'linear.gratis was essential for our early feedback collection. We built exactly what our users needed.'
    }
  },
  ecommerce: {
    slug: 'ecommerce',
    name: 'E-commerce',
    title: 'Linear for e-commerce: Customer feedback and feature requests',
    description: 'How e-commerce businesses use Linear to collect customer feedback, manage feature requests, and improve shopping experiences.',
    overview: 'E-commerce businesses need to continuously improve their platforms based on customer needs. Linear enables structured feedback collection and transparent development communication.',
    challenges: [
      'Customer feature requests lost in support tickets',
      'Difficulty prioritising platform improvements',
      'Lack of visibility into development progress',
      'Managing feedback from multiple customer touchpoints',
      'Balancing customer needs with business goals'
    ],
    solutions: [
      'Customer feedback forms integrated into shopping experience',
      'Feature request collection and prioritisation',
      'Public roadmap for customer engagement',
      'Structured customer feedback analysis',
      'Transparent development communication'
    ],
    benefits: [
      'Improved customer experience through targeted features',
      'Higher customer retention and satisfaction',
      'Better platform development prioritisation',
      'Increased customer engagement with brand',
      'Data-driven product improvement decisions'
    ],
    commonWorkflows: [
      {
        title: 'Customer experience feedback',
        steps: [
          'Customer completes purchase or browses site',
          'Prompted to provide feedback on experience',
          'Feedback creates Linear issue with customer journey context',
          'Development team prioritises UX improvements',
          'Customer sees improvements in subsequent visits'
        ]
      },
      {
        title: 'Feature request workflow',
        steps: [
          'Customer requests missing feature or improvement',
          'Request captured with customer context and urgency',
          'Product team evaluates impact and feasibility',
          'Feature development tracked transparently',
          'Customer notified when feature goes live'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Shopping experience feedback',
        description: 'Collect feedback on the shopping process',
        fields: ['Shopping stage', 'Experience rating', 'What was frustrating?', 'Suggested improvements']
      },
      {
        name: 'Feature request form',
        description: 'Customer feature and improvement requests',
        fields: ['Feature description', 'How would this help you?', 'How often would you use this?', 'Priority level']
      },
      {
        name: 'Product feedback form',
        description: 'Feedback on specific products or categories',
        fields: ['Product/category', 'Feedback type', 'Detailed comments', 'Suggested improvements']
      }
    ],
    integrations: ['Shopify', 'WooCommerce', 'Klaviyo', 'Zendesk', 'Google Analytics'],
    successStory: {
      company: 'ShopSmart E-commerce',
      result: '25% increase in customer satisfaction and 30% improvement in feature adoption',
      quote: 'Customer feedback drives our entire product roadmap now. We build what they actually want.'
    }
  },
  consultancies: {
    slug: 'consultancies',
    name: 'Consultancies',
    title: 'Linear for consultancies: Client engagement and project feedback',
    description: 'How consulting firms use Linear for client feedback collection, project management, and transparent communication throughout engagements.',
    overview: 'Consulting firms need to maintain close client relationships while delivering complex projects. Linear enables structured client communication and transparent project progress tracking.',
    challenges: [
      'Client feedback scattered across meetings and emails',
      'Lack of transparency in project deliverables',
      'Difficulty tracking client requirements and changes',
      'Managing multiple client engagements simultaneously',
      'Unclear communication of project status'
    ],
    solutions: [
      'Client-specific feedback forms for each engagement',
      'Public project dashboards for transparency',
      'Structured requirement gathering and change management',
      'Automated client communication workflows',
      'Centralised project feedback and issue tracking'
    ],
    benefits: [
      'Enhanced client satisfaction through transparency',
      'Improved project delivery and timeline management',
      'Better requirement gathering and scope management',
      'Increased client engagement and trust',
      'More efficient project communication'
    ],
    commonWorkflows: [
      {
        title: 'Client feedback workflow',
        steps: [
          'Client reviews project deliverable or milestone',
          'Provides feedback through dedicated engagement form',
          'Feedback creates Linear issues with project context',
          'Consulting team addresses feedback systematically',
          'Client sees progress through transparent dashboard'
        ]
      },
      {
        title: 'Requirement gathering workflow',
        steps: [
          'Initial client consultation identifies needs',
          'Requirements captured through structured forms',
          'Linear issues created for each requirement',
          'Client validates and prioritises requirements',
          'Project scope defined based on structured input'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Project feedback form',
        description: 'Collect client feedback on deliverables',
        fields: ['Project phase', 'Deliverable reviewed', 'Feedback category', 'Detailed comments', 'Required changes']
      },
      {
        name: 'Requirement gathering form',
        description: 'Structured client requirement collection',
        fields: ['Requirement category', 'Detailed description', 'Business justification', 'Priority level', 'Success criteria']
      },
      {
        name: 'Stakeholder feedback form',
        description: 'Gather input from multiple client stakeholders',
        fields: ['Stakeholder role', 'Area of expertise', 'Feedback/concerns', 'Recommendations']
      }
    ],
    integrations: ['Slack', 'Microsoft Teams', 'Notion', 'Calendly', 'DocuSign'],
    successStory: {
      company: 'Strategy Plus Consulting',
      result: '40% improvement in client satisfaction scores and 25% faster project delivery',
      quote: 'linear.gratis transformed our client communication. Projects run smoother and clients are happier.'
    }
  },
  nonprofits: {
    slug: 'nonprofits',
    name: 'Nonprofits',
    title: 'Linear for nonprofits: Community feedback and program management',
    description: 'How nonprofit organisations use Linear to collect community feedback, manage programs, and engage stakeholders transparently.',
    overview: 'Nonprofit organisations need to stay connected with their communities while managing limited resources efficiently. Linear provides free tools for feedback collection and transparent program management.',
    challenges: [
      'Limited budget for expensive software tools',
      'Need to engage diverse community stakeholders',
      'Difficulty tracking program effectiveness',
      'Scattered feedback from community members',
      'Lack of transparency in program development'
    ],
    solutions: [
      'Free community feedback collection with linear.gratis',
      'Public program dashboards for transparency',
      'Structured stakeholder engagement processes',
      'Community-driven program improvement',
      'Cost-effective communication infrastructure'
    ],
    benefits: [
      'Zero cost for feedback infrastructure',
      'Increased community engagement and trust',
      'Better program outcomes through feedback',
      'Enhanced donor and stakeholder transparency',
      'More efficient resource allocation'
    ],
    commonWorkflows: [
      {
        title: 'Community feedback workflow',
        steps: [
          'Community member experiences nonprofit program',
          'Provides feedback through accessible form',
          'Feedback creates Linear issue for program improvement',
          'Nonprofit team reviews and implements changes',
          'Community sees improvements and updates'
        ]
      },
      {
        title: 'Program development workflow',
        steps: [
          'Nonprofit identifies community need',
          'Gathers community input through feedback forms',
          'Develops program based on structured feedback',
          'Implements program with community involvement',
          'Collects ongoing feedback for continuous improvement'
        ]
      }
    ],
    formTemplates: [
      {
        name: 'Program feedback form',
        description: 'Collect feedback on nonprofit programs',
        fields: ['Program attended', 'Overall experience', 'What was most helpful?', 'Suggestions for improvement']
      },
      {
        name: 'Community needs assessment',
        description: 'Understand community needs and priorities',
        fields: ['Community area', 'Priority needs', 'Current challenges', 'Suggested solutions']
      },
      {
        name: 'Volunteer feedback form',
        description: 'Gather input from volunteers',
        fields: ['Volunteer role', 'Experience feedback', 'Training needs', 'Suggestions for improvement']
      }
    ],
    integrations: ['Slack', 'Google Workspace', 'Mailchimp', 'Zoom', 'Eventbrite'],
    successStory: {
      company: 'Community Impact Nonprofit',
      result: '60% increase in community engagement and 45% improvement in program effectiveness',
      quote: 'linear.gratis helped us listen to our community better and build programs they actually need.'
    }
  }
}