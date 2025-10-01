export interface FormTemplate {
  slug: string
  name: string
  title: string
  description: string
  overview: string
  category: string
  useCases: string[]
  fields: {
    name: string
    type: 'text' | 'textarea' | 'select' | 'email' | 'url' | 'number'
    placeholder: string
    required: boolean
    options?: string[]
    description?: string
  }[]
  linearSetup: {
    recommendedLabels: string[]
    priorityMapping: Record<string, number>
    stateMapping?: Record<string, string>
  }
  benefits: string[]
  bestFor: string[]
  integrationTips: string[]
  preview: {
    customerName: string
    sampleData: Record<string, string>
  }
}

export const templates: Record<string, FormTemplate> = {
  'bug-reports': {
    slug: 'bug-reports',
    name: 'Bug Reports',
    title: 'Bug report template for Linear: Structured issue tracking',
    description: 'Comprehensive bug report form template for Linear. Collect detailed bug information with reproduction steps, environment details, and priority classification.',
    overview: 'A structured bug report template that ensures all necessary information is collected for efficient debugging and resolution.',
    category: 'Support',
    useCases: [
      'Software development teams',
      'SaaS platforms',
      'Web applications',
      'Mobile apps',
      'Quality assurance processes'
    ],
    fields: [
      {
        name: 'reporter_name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        description: 'Name of the person reporting the bug'
      },
      {
        name: 'reporter_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Contact email for follow-up questions'
      },
      {
        name: 'bug_title',
        type: 'text',
        placeholder: 'Brief description of the bug',
        required: true,
        description: 'Concise title describing the issue'
      },
      {
        name: 'bug_description',
        type: 'textarea',
        placeholder: 'Detailed description of what went wrong...',
        required: true,
        description: 'Comprehensive description of the bug'
      },
      {
        name: 'reproduction_steps',
        type: 'textarea',
        placeholder: '1. Go to... 2. Click on... 3. See error...',
        required: true,
        description: 'Step-by-step instructions to reproduce the bug'
      },
      {
        name: 'expected_behavior',
        type: 'textarea',
        placeholder: 'What should have happened instead?',
        required: true,
        description: 'Expected behaviour vs actual behaviour'
      },
      {
        name: 'environment',
        type: 'text',
        placeholder: 'Chrome 120.0, Windows 11, Mobile',
        required: false,
        description: 'Browser, OS, device information'
      },
      {
        name: 'severity',
        type: 'select',
        placeholder: 'Select severity level',
        required: true,
        options: ['Critical - System unusable', 'High - Major feature broken', 'Medium - Feature partially working', 'Low - Minor issue'],
        description: 'Impact level of the bug'
      },
      {
        name: 'frequency',
        type: 'select',
        placeholder: 'How often does this occur?',
        required: false,
        options: ['Always', 'Often', 'Sometimes', 'Rarely', 'Once'],
        description: 'How frequently the bug occurs'
      }
    ],
    linearSetup: {
      recommendedLabels: ['bug', 'customer-reported', 'needs-investigation'],
      priorityMapping: {
        'Critical - System unusable': 1,
        'High - Major feature broken': 2,
        'Medium - Feature partially working': 3,
        'Low - Minor issue': 4
      }
    },
    benefits: [
      'Consistent bug report format',
      'All necessary debugging information collected',
      'Automatic priority assignment',
      'Reduced back-and-forth communication',
      'Faster bug resolution times'
    ],
    bestFor: [
      'Development teams receiving bug reports',
      'SaaS platforms with user-reported issues',
      'QA teams managing testing feedback',
      'Customer support teams triaging issues'
    ],
    integrationTips: [
      'Set up automatic assignment to QA team',
      'Configure severity-based priority mapping',
      'Add automatic labels for categorisation',
      'Set up notifications for critical bugs'
    ],
    preview: {
      customerName: 'Sarah Chen',
      sampleData: {
        reporter_name: 'Sarah Chen',
        reporter_email: 'sarah@techcorp.com',
        bug_title: 'Dashboard charts not loading on mobile Safari',
        bug_description: 'When viewing the analytics dashboard on mobile Safari, the charts section shows a loading spinner indefinitely and never displays the actual data.',
        reproduction_steps: '1. Open the app on iPhone Safari\n2. Navigate to Analytics → Dashboard\n3. Wait for page to load\n4. Charts section remains loading',
        expected_behavior: 'Charts should load and display analytics data within 2-3 seconds',
        environment: 'iPhone 13, Safari 16.1, iOS 16.2',
        severity: 'Medium - Feature partially working',
        frequency: 'Always'
      }
    }
  },
  'feature-requests': {
    slug: 'feature-requests',
    name: 'Feature Requests',
    title: 'Feature request template for Linear: Customer-driven development',
    description: 'Structured feature request form for Linear. Collect detailed feature ideas with business justification, use cases, and priority from customers.',
    overview: 'Capture comprehensive feature requests that help product teams understand customer needs and prioritise development effectively.',
    category: 'Product',
    useCases: [
      'Product management teams',
      'Customer-driven feature development',
      'SaaS roadmap planning',
      'User experience improvements',
      'Feature prioritisation processes'
    ],
    fields: [
      {
        name: 'requester_name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        description: 'Name of the person requesting the feature'
      },
      {
        name: 'requester_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Contact email for follow-up discussion'
      },
      {
        name: 'company_role',
        type: 'text',
        placeholder: 'Product Manager, Developer, etc.',
        required: false,
        description: 'Your role and how you\'d use this feature'
      },
      {
        name: 'feature_title',
        type: 'text',
        placeholder: 'Brief feature name or title',
        required: true,
        description: 'Concise name for the requested feature'
      },
      {
        name: 'feature_description',
        type: 'textarea',
        placeholder: 'Detailed description of the feature you\'d like to see...',
        required: true,
        description: 'Comprehensive description of the requested feature'
      },
      {
        name: 'use_case',
        type: 'textarea',
        placeholder: 'Describe how you would use this feature...',
        required: true,
        description: 'Specific use case and workflow'
      },
      {
        name: 'business_value',
        type: 'textarea',
        placeholder: 'How would this feature benefit your business?',
        required: true,
        description: 'Business justification and expected benefits'
      },
      {
        name: 'current_workaround',
        type: 'textarea',
        placeholder: 'How do you currently handle this need?',
        required: false,
        description: 'Current process or workaround being used'
      },
      {
        name: 'priority',
        type: 'select',
        placeholder: 'How important is this feature?',
        required: true,
        options: ['Critical - Blocking our workflow', 'High - Would significantly improve our work', 'Medium - Nice to have improvement', 'Low - Convenience feature'],
        description: 'Priority level from your perspective'
      },
      {
        name: 'timeline',
        type: 'select',
        placeholder: 'When do you need this?',
        required: false,
        options: ['ASAP - Urgently needed', 'Next month', 'Next quarter', 'This year', 'No specific timeline'],
        description: 'Desired timeline for implementation'
      }
    ],
    linearSetup: {
      recommendedLabels: ['feature-request', 'customer-requested', 'needs-evaluation'],
      priorityMapping: {
        'Critical - Blocking our workflow': 1,
        'High - Would significantly improve our work': 2,
        'Medium - Nice to have improvement': 3,
        'Low - Convenience feature': 4
      }
    },
    benefits: [
      'Structured feature evaluation process',
      'Clear business justification for features',
      'Customer context for development decisions',
      'Automatic priority classification',
      'Improved product-market fit'
    ],
    bestFor: [
      'Product teams gathering customer input',
      'SaaS companies planning roadmaps',
      'Customer success teams collecting feedback',
      'Startups validating feature ideas'
    ],
    integrationTips: [
      'Route to product management team',
      'Set up priority-based assignments',
      'Create automatic feature request labels',
      'Configure customer notification workflows'
    ],
    preview: {
      customerName: 'Alex Kumar',
      sampleData: {
        requester_name: 'Alex Kumar',
        requester_email: 'alex@designstudio.com',
        company_role: 'Lead Designer',
        feature_title: 'Dark mode support for dashboard',
        feature_description: 'Add a dark mode toggle to the main dashboard interface with proper contrast and accessibility compliance.',
        use_case: 'Our team works late hours and the bright interface causes eye strain. Dark mode would improve our daily workflow comfort.',
        business_value: 'Would improve team productivity during evening work sessions and align with our company\'s design system standards.',
        current_workaround: 'Using browser extensions to invert colors, but this breaks some UI elements and isn\'t a good solution.',
        priority: 'High - Would significantly improve our work',
        timeline: 'Next quarter'
      }
    }
  },
  'customer-feedback': {
    slug: 'customer-feedback',
    name: 'Customer Feedback',
    title: 'Customer feedback template for Linear: General improvements',
    description: 'General customer feedback form for Linear. Collect suggestions, improvements, and overall experience feedback from customers.',
    overview: 'A versatile feedback template for collecting general customer input, suggestions, and experience improvements.',
    category: 'Feedback',
    useCases: [
      'Customer experience teams',
      'General product feedback',
      'User experience research',
      'Customer satisfaction monitoring',
      'Continuous improvement processes'
    ],
    fields: [
      {
        name: 'customer_name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        description: 'Customer name for personalised follow-up'
      },
      {
        name: 'customer_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Email for feedback follow-up'
      },
      {
        name: 'customer_type',
        type: 'select',
        placeholder: 'How do you use our product?',
        required: false,
        options: ['Free user', 'Paid subscriber', 'Enterprise client', 'Trial user', 'Other'],
        description: 'Your relationship with our product'
      },
      {
        name: 'feedback_category',
        type: 'select',
        placeholder: 'What type of feedback is this?',
        required: true,
        options: ['User Experience', 'Feature Suggestion', 'Performance Issue', 'Content/Documentation', 'Billing/Account', 'General'],
        description: 'Category that best fits your feedback'
      },
      {
        name: 'feedback_title',
        type: 'text',
        placeholder: 'Brief summary of your feedback',
        required: true,
        description: 'Short title for your feedback'
      },
      {
        name: 'detailed_feedback',
        type: 'textarea',
        placeholder: 'Tell us about your experience, suggestions, or concerns...',
        required: true,
        description: 'Detailed feedback or suggestions'
      },
      {
        name: 'improvement_suggestion',
        type: 'textarea',
        placeholder: 'How do you think we could improve this?',
        required: false,
        description: 'Specific suggestions for improvement'
      },
      {
        name: 'overall_satisfaction',
        type: 'select',
        placeholder: 'How satisfied are you overall?',
        required: false,
        options: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'],
        description: 'Overall satisfaction rating'
      },
      {
        name: 'likelihood_recommend',
        type: 'select',
        placeholder: 'How likely are you to recommend us?',
        required: false,
        options: ['10 - Extremely likely', '9', '8', '7', '6', '5', '4', '3', '2', '1', '0 - Not at all likely'],
        description: 'Net Promoter Score (NPS) rating'
      }
    ],
    linearSetup: {
      recommendedLabels: ['customer-feedback', 'experience', 'improvement'],
      priorityMapping: {
        'Very dissatisfied': 1,
        'Dissatisfied': 2,
        'Neutral': 3,
        'Satisfied': 4,
        'Very satisfied': 4
      }
    },
    benefits: [
      'Comprehensive customer insight collection',
      'Categorised feedback for easy analysis',
      'NPS tracking for satisfaction monitoring',
      'Structured improvement suggestions',
      'Customer segmentation data'
    ],
    bestFor: [
      'Customer experience teams',
      'Product managers gathering insights',
      'Support teams collecting feedback',
      'Marketing teams understanding customer sentiment'
    ],
    integrationTips: [
      'Set up category-based routing',
      'Configure satisfaction-based priorities',
      'Create NPS tracking workflows',
      'Set up automatic follow-up processes'
    ],
    preview: {
      customerName: 'Emma Wilson',
      sampleData: {
        customer_name: 'Emma Wilson',
        customer_email: 'emma@marketingfirm.com',
        customer_type: 'Paid subscriber',
        feedback_category: 'User Experience',
        feedback_title: 'Dashboard navigation could be more intuitive',
        detailed_feedback: 'I love the functionality of the platform, but I often find myself getting lost in the navigation. The main menu structure isn\'t immediately clear, especially for new team members.',
        improvement_suggestion: 'Consider adding breadcrumbs and maybe reorganising the menu items by frequency of use rather than alphabetically.',
        overall_satisfaction: 'Satisfied',
        likelihood_recommend: '7'
      }
    }
  },
  'support-tickets': {
    slug: 'support-tickets',
    name: 'Support Tickets',
    title: 'Support ticket template for Linear: Customer help requests',
    description: 'Customer support ticket form for Linear. Structured help request collection with urgency classification and detailed problem information.',
    overview: 'Efficient support ticket template that ensures all necessary information is collected for quick resolution.',
    category: 'Support',
    useCases: [
      'Customer support teams',
      'Technical help requests',
      'Account and billing issues',
      'Product usage questions',
      'Troubleshooting workflows'
    ],
    fields: [
      {
        name: 'customer_name',
        type: 'text',
        placeholder: 'Your full name',
        required: true,
        description: 'Your name for personalised support'
      },
      {
        name: 'customer_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Email for support communication'
      },
      {
        name: 'account_info',
        type: 'text',
        placeholder: 'Company name or account ID',
        required: false,
        description: 'Account information to locate your profile'
      },
      {
        name: 'issue_category',
        type: 'select',
        placeholder: 'What type of issue is this?',
        required: true,
        options: ['Technical Problem', 'Account/Billing', 'Feature Question', 'Bug Report', 'Integration Help', 'Other'],
        description: 'Category that best describes your issue'
      },
      {
        name: 'urgency',
        type: 'select',
        placeholder: 'How urgent is this issue?',
        required: true,
        options: ['Critical - Service down/blocked', 'High - Major impact on work', 'Medium - Some impact on work', 'Low - General question'],
        description: 'Urgency level of your request'
      },
      {
        name: 'issue_title',
        type: 'text',
        placeholder: 'Brief description of your issue',
        required: true,
        description: 'Short summary of the problem'
      },
      {
        name: 'issue_description',
        type: 'textarea',
        placeholder: 'Detailed description of the issue you\'re experiencing...',
        required: true,
        description: 'Comprehensive description of the issue'
      },
      {
        name: 'steps_tried',
        type: 'textarea',
        placeholder: 'What have you already tried to resolve this?',
        required: false,
        description: 'Troubleshooting steps you\'ve already attempted'
      },
      {
        name: 'expected_outcome',
        type: 'textarea',
        placeholder: 'What would you like to happen?',
        required: false,
        description: 'Desired resolution or outcome'
      }
    ],
    linearSetup: {
      recommendedLabels: ['support-ticket', 'customer-request', 'needs-response'],
      priorityMapping: {
        'Critical - Service down/blocked': 1,
        'High - Major impact on work': 2,
        'Medium - Some impact on work': 3,
        'Low - General question': 4
      }
    },
    benefits: [
      'Structured support request handling',
      'Automatic urgency-based prioritisation',
      'Complete issue context collection',
      'Reduced support response time',
      'Improved customer satisfaction'
    ],
    bestFor: [
      'Customer support departments',
      'Technical support teams',
      'SaaS customer success teams',
      'Help desk operations'
    ],
    integrationTips: [
      'Set up urgency-based SLA workflows',
      'Configure automatic team assignments',
      'Create category-specific routing',
      'Set up customer notification templates'
    ],
    preview: {
      customerName: 'Michael Rodriguez',
      sampleData: {
        customer_name: 'Michael Rodriguez',
        customer_email: 'michael@techstartup.io',
        account_info: 'TechStartup Inc. - Pro Plan',
        issue_category: 'Technical Problem',
        urgency: 'High - Major impact on work',
        issue_title: 'Unable to export reports - getting timeout error',
        issue_description: 'When trying to export large reports (>1000 rows), the system shows a loading spinner for about 30 seconds, then displays a timeout error. This is preventing us from getting our monthly analytics.',
        steps_tried: 'Tried different browsers (Chrome, Firefox), cleared cache, reduced the date range, but still getting the same error.',
        expected_outcome: 'Ability to successfully export our monthly reports with all data included.'
      }
    }
  },
  'improvement-suggestions': {
    slug: 'improvement-suggestions',
    name: 'Improvement Suggestions',
    title: 'Improvement suggestions template for Linear: Product enhancements',
    description: 'Product improvement suggestion form for Linear. Collect enhancement ideas for existing features with impact analysis and user context.',
    overview: 'Capture targeted improvement suggestions for existing features to enhance user experience and product value.',
    category: 'Product',
    useCases: [
      'Existing feature enhancement',
      'User experience improvements',
      'Workflow optimisation suggestions',
      'Performance improvement ideas',
      'Interface enhancement requests'
    ],
    fields: [
      {
        name: 'suggester_name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        description: 'Your name for suggestion attribution'
      },
      {
        name: 'suggester_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Email for discussion and updates'
      },
      {
        name: 'user_role',
        type: 'text',
        placeholder: 'How do you use our product?',
        required: false,
        description: 'Your role and how you interact with the feature'
      },
      {
        name: 'feature_area',
        type: 'select',
        placeholder: 'Which area needs improvement?',
        required: true,
        options: ['Dashboard', 'Reports', 'Settings', 'Navigation', 'Search', 'Notifications', 'Mobile Experience', 'Performance', 'Other'],
        description: 'Product area that could be improved'
      },
      {
        name: 'improvement_title',
        type: 'text',
        placeholder: 'Brief title for your improvement idea',
        required: true,
        description: 'Concise title for the improvement'
      },
      {
        name: 'current_experience',
        type: 'textarea',
        placeholder: 'Describe how this feature currently works...',
        required: true,
        description: 'Current state and your experience with it'
      },
      {
        name: 'suggested_improvement',
        type: 'textarea',
        placeholder: 'Describe your improvement idea...',
        required: true,
        description: 'Detailed suggestion for improvement'
      },
      {
        name: 'expected_benefit',
        type: 'textarea',
        placeholder: 'How would this improvement help you?',
        required: true,
        description: 'Expected benefits and impact'
      },
      {
        name: 'frequency_of_use',
        type: 'select',
        placeholder: 'How often do you use this feature?',
        required: false,
        options: ['Multiple times daily', 'Daily', 'Weekly', 'Monthly', 'Rarely'],
        description: 'How frequently you interact with this area'
      },
      {
        name: 'impact_level',
        type: 'select',
        placeholder: 'How much would this improvement help?',
        required: true,
        options: ['Huge impact - Would transform my workflow', 'High impact - Would significantly help', 'Medium impact - Noticeable improvement', 'Low impact - Nice to have'],
        description: 'Expected impact of the improvement'
      }
    ],
    linearSetup: {
      recommendedLabels: ['improvement', 'enhancement', 'user-suggestion'],
      priorityMapping: {
        'Huge impact - Would transform my workflow': 1,
        'High impact - Would significantly help': 2,
        'Medium impact - Noticeable improvement': 3,
        'Low impact - Nice to have': 4
      }
    },
    benefits: [
      'Focused improvement suggestions',
      'User impact assessment',
      'Feature area categorisation',
      'Usage frequency insights',
      'Prioritised enhancement backlog'
    ],
    bestFor: [
      'Product teams optimising existing features',
      'UX teams gathering improvement ideas',
      'Development teams prioritising enhancements',
      'Customer success collecting user insights'
    ],
    integrationTips: [
      'Route suggestions to appropriate feature teams',
      'Set up impact-based prioritisation',
      'Create feature area labels',
      'Configure user feedback tracking'
    ],
    preview: {
      customerName: 'Lisa Park',
      sampleData: {
        suggester_name: 'Lisa Park',
        suggester_email: 'lisa@consultinggroup.com',
        user_role: 'Project Manager - manage client projects daily',
        feature_area: 'Dashboard',
        improvement_title: 'Add customisable dashboard widgets',
        current_experience: 'The dashboard shows preset widgets that don\'t always match what I need to see first. I have to click through multiple sections to get my daily overview.',
        suggested_improvement: 'Allow users to customise which widgets appear on their dashboard and in what order. Let us hide widgets we don\'t use and resize important ones.',
        expected_benefit: 'Would save 10-15 minutes daily by having all critical project info visible immediately when I log in.',
        frequency_of_use: 'Multiple times daily',
        impact_level: 'High impact - Would significantly help'
      }
    }
  },
  'user-interviews': {
    slug: 'user-interviews',
    name: 'User Interviews',
    title: 'User interview template for Linear: Research and insights',
    description: 'User interview request form for Linear. Collect user research participants and gather insights for product development decisions.',
    overview: 'Streamline user research by collecting interview participants and gathering structured insights from user conversations.',
    category: 'Research',
    useCases: [
      'User research programs',
      'Product development insights',
      'Feature validation studies',
      'User experience research',
      'Customer discovery processes'
    ],
    fields: [
      {
        name: 'participant_name',
        type: 'text',
        placeholder: 'Your name',
        required: true,
        description: 'Participant name for research records'
      },
      {
        name: 'participant_email',
        type: 'email',
        placeholder: 'your.email@company.com',
        required: true,
        description: 'Email for interview scheduling'
      },
      {
        name: 'company_industry',
        type: 'text',
        placeholder: 'Your company and industry',
        required: false,
        description: 'Company context for research segmentation'
      },
      {
        name: 'user_type',
        type: 'select',
        placeholder: 'How do you use our product?',
        required: true,
        options: ['Daily active user', 'Weekly user', 'Monthly user', 'Trial user', 'Former user', 'Potential user'],
        description: 'Your usage pattern and relationship'
      },
      {
        name: 'role_responsibilities',
        type: 'textarea',
        placeholder: 'Describe your role and daily responsibilities...',
        required: true,
        description: 'Your job role and how our product fits in'
      },
      {
        name: 'usage_context',
        type: 'textarea',
        placeholder: 'How and when do you use our product?',
        required: true,
        description: 'Specific ways you use the product'
      },
      {
        name: 'biggest_challenges',
        type: 'textarea',
        placeholder: 'What are your biggest challenges with our product?',
        required: false,
        description: 'Pain points and areas for improvement'
      },
      {
        name: 'feature_priorities',
        type: 'textarea',
        placeholder: 'What features matter most to you?',
        required: false,
        description: 'Most important features and capabilities'
      },
      {
        name: 'interview_availability',
        type: 'select',
        placeholder: 'When are you available for a 30-minute interview?',
        required: true,
        options: ['Weekday mornings', 'Weekday afternoons', 'Weekday evenings', 'Weekend mornings', 'Weekend afternoons', 'Flexible - any time'],
        description: 'Your availability for research interview'
      },
      {
        name: 'research_topics',
        type: 'select',
        placeholder: 'What would you like to discuss?',
        required: false,
        options: ['Overall product experience', 'Specific feature feedback', 'Workflow and processes', 'Integration needs', 'Future feature ideas', 'Competitive comparisons'],
        description: 'Areas you\'d like to provide insights on'
      }
    ],
    linearSetup: {
      recommendedLabels: ['user-research', 'interview-request', 'insights'],
      priorityMapping: {
        'Daily active user': 1,
        'Weekly user': 2,
        'Monthly user': 3,
        'Trial user': 3,
        'Former user': 2,
        'Potential user': 4
      }
    },
    benefits: [
      'Structured user research recruitment',
      'Pre-interview context collection',
      'User segmentation for research',
      'Research topic prioritisation',
      'Streamlined interview scheduling'
    ],
    bestFor: [
      'Product research teams',
      'UX researchers gathering insights',
      'Product managers validating ideas',
      'Customer success understanding users'
    ],
    integrationTips: [
      'Route to research team automatically',
      'Set up user type based prioritisation',
      'Create research topic categories',
      'Configure interview scheduling workflows'
    ],
    preview: {
      customerName: 'David Chen',
      sampleData: {
        participant_name: 'David Chen',
        participant_email: 'david@innovatetech.com',
        company_industry: 'InnovateTech - Software Development',
        user_type: 'Daily active user',
        role_responsibilities: 'Lead Developer - I manage our team\'s development workflow, review code, and coordinate with product managers on feature priorities.',
        usage_context: 'I use the platform throughout the day to track project progress, review team submissions, and communicate with stakeholders about development status.',
        biggest_challenges: 'Sometimes the interface feels cluttered when managing multiple projects simultaneously. The notification system can also be overwhelming during busy periods.',
        feature_priorities: 'Code review workflows, project timeline views, and team collaboration features are most critical for my daily work.',
        interview_availability: 'Weekday afternoons',
        research_topics: 'Workflow and processes'
      }
    }
  }
}