export interface Integration {
  slug: string
  name: string
  title: string
  description: string
  overview: string
  category: string
  difficulty: 'Easy' | 'Medium' | 'Advanced'
  timeToSetup: string
  officialSupport: boolean
  features: {
    bidirectionalSync: boolean
    automation: boolean
    realTimeNotifications: boolean
    customFields: boolean
    bulkOperations: boolean
  }
  benefits: string[]
  limitations: string[]
  setupSteps: {
    title: string
    description: string
    codeExample?: string
    screenshot?: string
  }[]
  automationIdeas: {
    trigger: string
    action: string
    useCase: string
  }[]
  troubleshooting: {
    issue: string
    solution: string
  }[]
  relatedIntegrations: string[]
  useCases: string[]
}

export const integrations: Record<string, Integration> = {
  slack: {
    slug: 'slack',
    name: 'Slack',
    title: 'Linear + Slack integration: Complete setup guide 2025',
    description: 'Connect Linear with Slack for real-time notifications, issue creation, and team collaboration. Step-by-step guide with automation ideas.',
    overview: 'Integrate Linear with Slack to streamline team communication and keep everyone updated on issue progress without leaving Slack.',
    category: 'Team Communication',
    difficulty: 'Easy',
    timeToSetup: '10 minutes',
    officialSupport: true,
    features: {
      bidirectionalSync: true,
      automation: true,
      realTimeNotifications: true,
      customFields: false,
      bulkOperations: false
    },
    benefits: [
      'Real-time Linear notifications in Slack channels',
      'Create Linear issues directly from Slack messages',
      'Team visibility into issue progress',
      'Reduced context switching between tools',
      'Automated status updates'
    ],
    limitations: [
      'Limited custom field support',
      'No bulk operations through Slack',
      'Requires Linear Pro plan for advanced features'
    ],
    setupSteps: [
      {
        title: 'Install Linear Slack app',
        description: 'Go to your Linear workspace settings and find the Slack integration section. Click "Install" to add the Linear app to your Slack workspace.'
      },
      {
        title: 'Authorise permissions',
        description: 'Grant the necessary permissions for Linear to post to channels and read messages. This allows for bidirectional communication.'
      },
      {
        title: 'Configure notification channels',
        description: 'Choose which Slack channels should receive Linear notifications. You can set up different channels for different teams or projects.'
      },
      {
        title: 'Set up issue creation',
        description: 'Configure slash commands and message actions to create Linear issues directly from Slack conversations.'
      },
      {
        title: 'Test the integration',
        description: 'Create a test issue in Linear and verify that notifications appear in your designated Slack channel.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'Critical bug reported in #alerts channel',
        action: 'Automatically create high-priority Linear issue',
        useCase: 'Incident response and critical bug tracking'
      },
      {
        trigger: 'Issue status changes to "Done"',
        action: 'Post completion message to team channel',
        useCase: 'Team celebration and progress visibility'
      },
      {
        trigger: 'New feature request in #feedback',
        action: 'Create Linear issue with "feature-request" label',
        useCase: 'Customer feedback collection and prioritisation'
      }
    ],
    troubleshooting: [
      {
        issue: 'Notifications not appearing in Slack',
        solution: 'Check that the Linear app has permission to post in the target channel and that notification settings are enabled in Linear.'
      },
      {
        issue: 'Unable to create issues from Slack',
        solution: 'Verify that the user has issue creation permissions in Linear and that the Slack integration is properly authenticated.'
      },
      {
        issue: 'Too many notifications',
        solution: 'Refine notification filters in Linear settings to only send alerts for specific issue types or priority levels.'
      }
    ],
    relatedIntegrations: ['teams', 'discord', 'webhooks'],
    useCases: [
      'Development team coordination',
      'Bug report management',
      'Feature request tracking',
      'Sprint planning communication',
      'Incident response'
    ]
  },
  notion: {
    slug: 'notion',
    name: 'Notion',
    title: 'Linear + Notion integration: Sync issues and docs 2025',
    description: 'Connect Linear with Notion to sync issues, create documentation, and maintain project visibility. Complete setup guide and automation ideas.',
    overview: 'Bridge Linear issues with Notion pages for comprehensive project documentation and enhanced team collaboration.',
    category: 'Documentation',
    difficulty: 'Medium',
    timeToSetup: '20 minutes',
    officialSupport: false,
    features: {
      bidirectionalSync: true,
      automation: true,
      realTimeNotifications: false,
      customFields: true,
      bulkOperations: true
    },
    benefits: [
      'Sync Linear issues with Notion databases',
      'Create project documentation linked to issues',
      'Enhanced reporting and analytics',
      'Custom views and filters in Notion',
      'Combined project planning and execution'
    ],
    limitations: [
      'Requires third-party automation tools (Zapier/Make)',
      'No real-time sync without additional setup',
      'API rate limits may affect large syncs'
    ],
    setupSteps: [
      {
        title: 'Create Notion integration',
        description: 'In Notion, create a new integration and obtain your API token. This will allow external services to access your Notion workspace.',
        codeExample: `// Get your Notion API token from:
// https://www.notion.so/my-integrations`
      },
      {
        title: 'Set up Linear webhook',
        description: 'Configure a webhook in Linear to send issue updates to your automation service.',
        codeExample: `// Linear webhook payload example:
{
  "action": "create",
  "data": {
    "id": "issue-123",
    "title": "Bug: Login form validation",
    "state": "Todo",
    "priority": 2
  }
}`
      },
      {
        title: 'Create Notion database',
        description: 'Set up a Notion database with properties that match your Linear issue fields (title, status, priority, assignee, etc.).'
      },
      {
        title: 'Configure automation flow',
        description: 'Use Zapier or Make.com to create workflows that sync data between Linear and Notion when issues are created or updated.'
      },
      {
        title: 'Test bidirectional sync',
        description: 'Create an issue in Linear and verify it appears in Notion, then update it in Notion and check that changes sync back to Linear.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'New Linear issue created',
        action: 'Create corresponding Notion page with issue details',
        useCase: 'Project documentation and tracking'
      },
      {
        trigger: 'Issue status changes to "In Progress"',
        action: 'Update Notion database and notify team',
        useCase: 'Progress tracking and team coordination'
      },
      {
        trigger: 'Sprint completed in Linear',
        action: 'Generate sprint report in Notion',
        useCase: 'Sprint retrospectives and planning'
      }
    ],
    troubleshooting: [
      {
        issue: 'Sync delays between Linear and Notion',
        solution: 'Check automation tool triggers and consider using webhooks for real-time updates instead of polling.'
      },
      {
        issue: 'Missing fields in Notion database',
        solution: 'Ensure all required properties exist in your Notion database and match the Linear issue schema.'
      },
      {
        issue: 'Authentication errors',
        solution: 'Verify that your Notion integration token has access to the target database and that Linear API key is valid.'
      }
    ],
    relatedIntegrations: ['zapier', 'webhooks', 'api'],
    useCases: [
      'Project documentation',
      'Sprint planning and reviews',
      'Technical specifications',
      'Team knowledge base',
      'Progress reporting'
    ]
  },
  github: {
    slug: 'github',
    name: 'GitHub',
    title: 'Linear + GitHub integration: Link issues to commits 2025',
    description: 'Connect Linear with GitHub for automatic issue linking, PR management, and development workflow automation. Complete developer guide.',
    overview: 'Seamlessly connect your Linear issues with GitHub repositories for enhanced development workflow and traceability.',
    category: 'Development',
    difficulty: 'Easy',
    timeToSetup: '5 minutes',
    officialSupport: true,
    features: {
      bidirectionalSync: true,
      automation: true,
      realTimeNotifications: true,
      customFields: false,
      bulkOperations: false
    },
    benefits: [
      'Automatic issue status updates from commits',
      'Link pull requests to Linear issues',
      'Branch creation from Linear issues',
      'Deployment tracking and release notes',
      'Code review integration'
    ],
    limitations: [
      'Limited to GitHub repositories',
      'Requires specific commit message format',
      'Some features require Linear Pro plan'
    ],
    setupSteps: [
      {
        title: 'Install Linear GitHub app',
        description: 'Go to GitHub marketplace and install the Linear app, or use the integration section in your Linear workspace.',
        codeExample: `# Install via GitHub CLI
gh extension install linear/linear-cli`
      },
      {
        title: 'Authorise repository access',
        description: 'Grant Linear access to the repositories you want to integrate. You can choose specific repos or allow access to all.'
      },
      {
        title: 'Configure commit message format',
        description: 'Set up commit message templates that include Linear issue IDs for automatic linking.',
        codeExample: `# Commit message format examples:
git commit -m "Fix login validation - LIN-123"
git commit -m "Add user dashboard (closes LIN-456)"`
      },
      {
        title: 'Set up branch naming',
        description: 'Configure automatic branch creation from Linear issues with consistent naming conventions.',
        codeExample: `# Auto-generated branch names:
feature/LIN-123-add-user-authentication
bugfix/LIN-456-fix-payment-flow`
      },
      {
        title: 'Test the workflow',
        description: 'Create a Linear issue, branch from it, make a commit with the issue ID, and verify the integration works.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'Pull request merged',
        action: 'Automatically move Linear issue to "Done"',
        useCase: 'Development workflow automation'
      },
      {
        trigger: 'Linear issue assigned',
        action: 'Create feature branch in GitHub',
        useCase: 'Development task setup'
      },
      {
        trigger: 'Deployment completed',
        action: 'Update all related Linear issues',
        useCase: 'Release tracking and communication'
      }
    ],
    troubleshooting: [
      {
        issue: 'Commits not linking to Linear issues',
        solution: 'Ensure commit messages include the correct Linear issue ID format (LIN-XXX) and that the repository is connected.'
      },
      {
        issue: 'Branch creation not working',
        solution: 'Check that the Linear GitHub app has write permissions to your repository and that branch protection rules allow creation.'
      },
      {
        issue: 'Pull request not updating issue status',
        solution: 'Verify that the PR description or commits reference the Linear issue ID and that status automation is enabled.'
      }
    ],
    relatedIntegrations: ['gitlab', 'bitbucket', 'webhooks'],
    useCases: [
      'Feature development tracking',
      'Bug fix workflow',
      'Release management',
      'Code review process',
      'Development metrics'
    ]
  },
  zapier: {
    slug: 'zapier',
    name: 'Zapier',
    title: 'Linear + Zapier integration: Automate anything 2025',
    description: 'Connect Linear with 5000+ apps using Zapier. Create powerful automations for customer feedback, project management, and team workflows.',
    overview: 'Use Zapier to connect Linear with virtually any app, creating custom automation workflows tailored to your team\'s needs.',
    category: 'Automation',
    difficulty: 'Medium',
    timeToSetup: '15 minutes',
    officialSupport: true,
    features: {
      bidirectionalSync: true,
      automation: true,
      realTimeNotifications: true,
      customFields: true,
      bulkOperations: true
    },
    benefits: [
      'Connect Linear to 5000+ applications',
      'Create custom automation workflows',
      'No coding required for integrations',
      'Multi-step automation sequences',
      'Conditional logic and filters'
    ],
    limitations: [
      'Requires Zapier subscription for advanced features',
      'Monthly task limits based on plan',
      'Potential delays in automation triggers'
    ],
    setupSteps: [
      {
        title: 'Connect Linear to Zapier',
        description: 'In Zapier, search for Linear and authenticate your account using your Linear API key.',
        codeExample: `# Generate Linear API key:
# 1. Go to Linear Settings → API
# 2. Create new personal API key
# 3. Copy and paste into Zapier`
      },
      {
        title: 'Choose trigger application',
        description: 'Select what app or event will trigger your automation (e.g., new email, form submission, calendar event).'
      },
      {
        title: 'Configure Linear action',
        description: 'Set up what happens in Linear when triggered (create issue, update status, add comment, etc.).',
        codeExample: `# Example Zap configuration:
Trigger: New Typeform submission
Action: Create Linear issue with form data
Fields: Map form fields to Linear issue properties`
      },
      {
        title: 'Add conditional logic',
        description: 'Use Zapier filters to only run automations under specific conditions (priority, keywords, etc.).'
      },
      {
        title: 'Test and activate',
        description: 'Run test automations to ensure data flows correctly, then activate your Zap for live use.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'New customer feedback in Intercom',
        action: 'Create Linear issue with customer context',
        useCase: 'Customer feedback management'
      },
      {
        trigger: 'Airtable project status changes',
        action: 'Update corresponding Linear issue',
        useCase: 'Project management synchronisation'
      },
      {
        trigger: 'Calendly meeting scheduled',
        action: 'Create Linear issue for meeting prep',
        useCase: 'Meeting and task management'
      }
    ],
    troubleshooting: [
      {
        issue: 'Zap not triggering',
        solution: 'Check that the trigger app is sending the expected data format and that your Zap filters are not too restrictive.'
      },
      {
        issue: 'Missing data in Linear issues',
        solution: 'Verify field mapping in your Zap configuration and ensure all required Linear fields are populated.'
      },
      {
        issue: 'Automation delays',
        solution: 'Check your Zapier plan limits and consider upgrading for faster automation processing.'
      }
    ],
    relatedIntegrations: ['webhooks', 'api', 'make'],
    useCases: [
      'Customer feedback automation',
      'Lead qualification and follow-up',
      'Project status synchronisation',
      'Content creation workflows',
      'Marketing campaign management'
    ]
  },
  discord: {
    slug: 'discord',
    name: 'Discord',
    title: 'Linear + Discord integration: Community feedback 2025',
    description: 'Connect Linear with Discord for community feedback collection, bug reports, and feature requests. Setup guide for gaming and tech communities.',
    overview: 'Integrate Linear with Discord to collect community feedback, manage bug reports, and engage with your user base directly.',
    category: 'Community',
    difficulty: 'Medium',
    timeToSetup: '25 minutes',
    officialSupport: false,
    features: {
      bidirectionalSync: false,
      automation: true,
      realTimeNotifications: true,
      customFields: false,
      bulkOperations: false
    },
    benefits: [
      'Collect feedback from Discord community',
      'Automated issue creation from bot commands',
      'Community engagement and transparency',
      'Bug report collection with user context',
      'Feature request voting and discussion'
    ],
    limitations: [
      'Requires custom bot development',
      'No built-in bidirectional sync',
      'Limited to Discord server members'
    ],
    setupSteps: [
      {
        title: 'Create Discord bot',
        description: 'Create a new Discord application and bot in the Discord Developer Portal.',
        codeExample: `# Discord bot setup:
# 1. Go to https://discord.com/developers/applications
# 2. Create new application
# 3. Go to Bot section and create bot
# 4. Copy bot token for later use`
      },
      {
        title: 'Set up bot permissions',
        description: 'Configure necessary permissions for the bot to read messages, send messages, and use slash commands.',
        codeExample: `# Required bot permissions:
# - Send Messages
# - Use Slash Commands
# - Read Message History
# - Add Reactions`
      },
      {
        title: 'Deploy bot with Linear integration',
        description: 'Deploy a bot that can create Linear issues from Discord commands or reactions.',
        codeExample: `# Example bot command:
/bugreport title:"Login broken" description:"Can't log in with Google" priority:"High"`
      },
      {
        title: 'Configure webhook notifications',
        description: 'Set up webhooks to send Linear issue updates back to Discord channels.'
      },
      {
        title: 'Add community features',
        description: 'Implement upvoting, issue status commands, and feedback collection features.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'User reacts with 🐛 emoji',
        action: 'Bot prompts for bug report details',
        useCase: 'Easy bug reporting from community'
      },
      {
        trigger: 'Linear issue status changes',
        action: 'Post update in Discord channel',
        useCase: 'Community transparency and engagement'
      },
      {
        trigger: 'New feature suggestion in #feedback',
        action: 'Create Linear issue with community votes',
        useCase: 'Community-driven feature prioritisation'
      }
    ],
    troubleshooting: [
      {
        issue: 'Bot not responding to commands',
        solution: 'Check bot permissions, ensure it\'s online, and verify command syntax matches your implementation.'
      },
      {
        issue: 'Linear API authentication failing',
        solution: 'Verify your Linear API token is correct and has necessary permissions for issue creation.'
      },
      {
        issue: 'Webhook notifications not working',
        solution: 'Check webhook URL configuration and ensure your bot server is accessible from Linear\'s servers.'
      }
    ],
    relatedIntegrations: ['slack', 'webhooks', 'api'],
    useCases: [
      'Gaming community feedback',
      'Open source project management',
      'Beta testing coordination',
      'Community feature requests',
      'Technical support automation'
    ]
  },
  teams: {
    slug: 'teams',
    name: 'Microsoft Teams',
    title: 'Linear + Microsoft Teams integration: Enterprise workflow 2025',
    description: 'Connect Linear with Microsoft Teams for enterprise team collaboration, notifications, and issue management. Complete setup guide.',
    overview: 'Integrate Linear with Microsoft Teams to enhance enterprise team collaboration and keep everyone updated on project progress.',
    category: 'Enterprise Communication',
    difficulty: 'Medium',
    timeToSetup: '20 minutes',
    officialSupport: false,
    features: {
      bidirectionalSync: false,
      automation: true,
      realTimeNotifications: true,
      customFields: false,
      bulkOperations: false
    },
    benefits: [
      'Linear notifications in Teams channels',
      'Issue creation from Teams conversations',
      'Enterprise-grade security and compliance',
      'Integration with Microsoft 365 ecosystem',
      'Team collaboration on Linear issues'
    ],
    limitations: [
      'Requires Power Automate for advanced features',
      'Limited compared to native Slack integration',
      'May require IT approval in enterprise environments'
    ],
    setupSteps: [
      {
        title: 'Set up Power Automate flow',
        description: 'Create a Power Automate flow to connect Teams with Linear using webhooks and HTTP requests.'
      },
      {
        title: 'Configure Linear webhooks',
        description: 'Set up webhooks in Linear to send issue updates to your Power Automate flow.'
      },
      {
        title: 'Create Teams connector',
        description: 'Configure the Teams connector in Power Automate to post messages to specific channels.'
      },
      {
        title: 'Set up adaptive cards',
        description: 'Design adaptive cards to display Linear issue information in a user-friendly format.'
      },
      {
        title: 'Test integration',
        description: 'Create test issues and verify notifications appear correctly in Teams channels.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'High priority issue created',
        action: 'Send adaptive card to management channel',
        useCase: 'Executive visibility into critical issues'
      },
      {
        trigger: 'Sprint completed',
        action: 'Post summary report to team channel',
        useCase: 'Sprint retrospectives and planning'
      },
      {
        trigger: 'Issue blocked for >24 hours',
        action: 'Escalate to team lead in Teams',
        useCase: 'Bottleneck identification and resolution'
      }
    ],
    troubleshooting: [
      {
        issue: 'Power Automate flow not triggering',
        solution: 'Check webhook configuration and ensure the trigger URL is correct and accessible.'
      },
      {
        issue: 'Adaptive cards not displaying correctly',
        solution: 'Verify card schema and ensure all required fields are included in the JSON payload.'
      },
      {
        issue: 'Authentication issues',
        solution: 'Check that all connectors are properly authenticated and have necessary permissions.'
      }
    ],
    relatedIntegrations: ['slack', 'outlook', 'sharepoint'],
    useCases: [
      'Enterprise project management',
      'Executive reporting and visibility',
      'Cross-functional team coordination',
      'Compliance and audit tracking',
      'Integration with Microsoft 365 workflows'
    ]
  },
  webhooks: {
    slug: 'webhooks',
    name: 'Webhooks',
    title: 'Linear webhooks: Custom integrations guide 2025',
    description: 'Build custom Linear integrations using webhooks. Complete developer guide with examples, security, and best practices.',
    overview: 'Use Linear webhooks to build custom integrations and automate workflows with any external system or application.',
    category: 'Developer Tools',
    difficulty: 'Advanced',
    timeToSetup: '30+ minutes',
    officialSupport: true,
    features: {
      bidirectionalSync: false,
      automation: true,
      realTimeNotifications: true,
      customFields: true,
      bulkOperations: false
    },
    benefits: [
      'Real-time event notifications',
      'Custom integration possibilities',
      'Flexible data processing',
      'Scalable automation architecture',
      'Integration with any HTTP-enabled service'
    ],
    limitations: [
      'Requires development knowledge',
      'One-way communication (Linear to external)',
      'Need to handle webhook security and reliability'
    ],
    setupSteps: [
      {
        title: 'Create webhook endpoint',
        description: 'Set up an HTTP endpoint to receive webhook payloads from Linear.',
        codeExample: `// Express.js webhook endpoint example
app.post('/linear-webhook', (req, res) => {
  const payload = req.body;
  const signature = req.headers['linear-signature'];

  // Verify webhook signature
  if (!verifySignature(payload, signature)) {
    return res.status(401).send('Unauthorized');
  }

  // Process the webhook
  handleLinearEvent(payload);
  res.status(200).send('OK');
});`
      },
      {
        title: 'Configure webhook in Linear',
        description: 'Add your endpoint URL in Linear workspace settings and select which events to receive.',
        codeExample: `# Webhook configuration:
URL: https://yourapp.com/linear-webhook
Events: issue.create, issue.update, comment.create
Secret: your-webhook-secret-key`
      },
      {
        title: 'Implement signature verification',
        description: 'Verify webhook authenticity using the signature header to ensure security.',
        codeExample: `const crypto = require('crypto');

function verifySignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === \`sha256=\${expectedSignature}\`;
}`
      },
      {
        title: 'Handle webhook events',
        description: 'Process different event types and implement your custom logic.',
        codeExample: `function handleLinearEvent(payload) {
  switch (payload.action) {
    case 'create':
      handleIssueCreated(payload.data);
      break;
    case 'update':
      handleIssueUpdated(payload.data, payload.updatedFrom);
      break;
    case 'remove':
      handleIssueDeleted(payload.data);
      break;
  }
}`
      },
      {
        title: 'Implement error handling',
        description: 'Add retry logic and error handling for robust webhook processing.'
      }
    ],
    automationIdeas: [
      {
        trigger: 'Issue created with "customer-reported" label',
        action: 'Send notification to customer success team',
        useCase: 'Customer issue escalation'
      },
      {
        trigger: 'Issue marked as "Done"',
        action: 'Update external project tracking system',
        useCase: 'Cross-platform project synchronisation'
      },
      {
        trigger: 'Comment added to critical issue',
        action: 'Send SMS alert to on-call engineer',
        useCase: 'Critical incident management'
      }
    ],
    troubleshooting: [
      {
        issue: 'Webhook not receiving events',
        solution: 'Check that your endpoint is publicly accessible, returns 200 OK, and the URL is correctly configured in Linear.'
      },
      {
        issue: 'Signature verification failing',
        solution: 'Ensure you\'re using the correct webhook secret and following the exact signature calculation process.'
      },
      {
        issue: 'Webhook timeouts',
        solution: 'Optimize your endpoint response time (Linear expects response within 10 seconds) and consider async processing.'
      }
    ],
    relatedIntegrations: ['api', 'zapier', 'custom'],
    useCases: [
      'Custom notification systems',
      'Data synchronisation',
      'External system integration',
      'Analytics and reporting',
      'Automated workflows'
    ]
  },
  api: {
    slug: 'api',
    name: 'Linear API',
    title: 'Linear API: Complete developer integration guide 2025',
    description: 'Build powerful Linear integrations using the GraphQL API. Complete guide with authentication, queries, mutations, and best practices.',
    overview: 'Use the Linear GraphQL API to build sophisticated integrations, automate workflows, and create custom applications.',
    category: 'Developer Tools',
    difficulty: 'Advanced',
    timeToSetup: '45+ minutes',
    officialSupport: true,
    features: {
      bidirectionalSync: true,
      automation: true,
      realTimeNotifications: false,
      customFields: true,
      bulkOperations: true
    },
    benefits: [
      'Full Linear functionality access',
      'GraphQL flexibility and efficiency',
      'Bidirectional data synchronisation',
      'Bulk operations support',
      'Custom application development'
    ],
    limitations: [
      'Requires GraphQL and API knowledge',
      'Rate limiting applies',
      'No real-time subscriptions'
    ],
    setupSteps: [
      {
        title: 'Generate API key',
        description: 'Create a personal API key in Linear settings for authentication.',
        codeExample: `# Generate API key:
# 1. Go to Linear Settings → API
# 2. Create new personal API key
# 3. Store securely in environment variables

LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxx`
      },
      {
        title: 'Set up GraphQL client',
        description: 'Configure a GraphQL client to interact with the Linear API.',
        codeExample: `// Using Apollo Client
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: 'https://api.linear.app/graphql',
});

const authLink = setContext((_, { headers }) => ({
  headers: {
    ...headers,
    authorization: \`Bearer \${process.env.LINEAR_API_KEY}\`,
  }
}));

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});`
      },
      {
        title: 'Query Linear data',
        description: 'Fetch issues, teams, and other data using GraphQL queries.',
        codeExample: `// Fetch issues query
const GET_ISSUES = gql\`
  query GetIssues($filter: IssueFilter) {
    issues(filter: $filter) {
      nodes {
        id
        title
        description
        state {
          name
        }
        assignee {
          name
          email
        }
        createdAt
        updatedAt
      }
    }
  }
\`;`
      },
      {
        title: 'Create and update issues',
        description: 'Use mutations to create, update, and manage Linear issues.',
        codeExample: `// Create issue mutation
const CREATE_ISSUE = gql\`
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        title
        url
      }
    }
  }
\`;

// Usage
const { data } = await client.mutate({
  mutation: CREATE_ISSUE,
  variables: {
    input: {
      title: "New feature request",
      description: "Detailed description",
      teamId: "team_id_here",
      priority: 2
    }
  }
});`
      },
      {
        title: 'Handle pagination and rate limits',
        description: 'Implement proper pagination and respect API rate limits.',
        codeExample: `// Pagination example
const getAllIssues = async () => {
  let allIssues = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const { data } = await client.query({
      query: GET_ISSUES_PAGINATED,
      variables: { after: cursor }
    });

    allIssues = allIssues.concat(data.issues.nodes);
    hasNextPage = data.issues.pageInfo.hasNextPage;
    cursor = data.issues.pageInfo.endCursor;
  }

  return allIssues;
};`
      }
    ],
    automationIdeas: [
      {
        trigger: 'Scheduled job (daily/weekly)',
        action: 'Generate progress reports from Linear data',
        useCase: 'Automated reporting and analytics'
      },
      {
        trigger: 'External system update',
        action: 'Sync data to Linear issues',
        useCase: 'Cross-platform data synchronisation'
      },
      {
        trigger: 'User action in custom app',
        action: 'Create or update Linear issues',
        useCase: 'Custom application integration'
      }
    ],
    troubleshooting: [
      {
        issue: 'Authentication errors',
        solution: 'Verify your API key is correct, active, and included in the Authorization header with Bearer prefix.'
      },
      {
        issue: 'Rate limit exceeded',
        solution: 'Implement exponential backoff and reduce request frequency. Linear allows 60 requests per minute.'
      },
      {
        issue: 'GraphQL query errors',
        solution: 'Use the Linear API explorer to test queries and ensure proper syntax and field availability.'
      }
    ],
    relatedIntegrations: ['webhooks', 'zapier', 'custom'],
    useCases: [
      'Custom dashboard development',
      'Data migration and synchronisation',
      'Advanced reporting and analytics',
      'Workflow automation',
      'Third-party application integration'
    ]
  }
}