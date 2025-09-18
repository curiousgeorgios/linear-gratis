'use client'

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  X,
  Clock,
  Heart,
  Github,
  ArrowRight,
  Star
} from "lucide-react"
import Link from "next/link"

const features = [
  {
    category: "Core feedback collection",
    items: [
      {
        feature: "Client feedback forms",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Direct Linear integration",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Custom form creation",
        linearGratis: "check",
        steelSync: "check",
        lindie: "x"
      },
      {
        feature: "Issue auto-creation",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Customer information capture",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Unlimited submissions",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Sharing & collaboration",
    items: [
      {
        feature: "Shareable form links",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Public roadmap sharing",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Private project sharing",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Real-time Linear sync",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Stakeholder read-only access",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Team collaboration features",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Customisation & branding",
    items: [
      {
        feature: "Basic form customisation",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Custom branding/logos",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "White-label options",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Custom domains",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "x"
      },
      {
        feature: "Advanced styling options",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Theme customisation",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Security & access control",
    items: [
      {
        feature: "Basic authentication",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Domain restrictions",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "IP allowlisting",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "SSO integration",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "Enterprise security compliance",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "Audit logs",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Automation & AI",
    items: [
      {
        feature: "Webhook integration",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "AI-generated changelogs",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Automated notifications",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Smart issue categorisation",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "x"
      },
      {
        feature: "Auto-tagging",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Workflow automation",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Analytics & reporting",
    items: [
      {
        feature: "Basic submission tracking",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Advanced analytics dashboard",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Custom reports",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Export capabilities",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Performance metrics",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Usage insights",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Integrations",
    items: [
      {
        feature: "Linear integration",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Slack notifications",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Email notifications",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Zapier integration",
        linearGratis: "soon",
        steelSync: "x",
        lindie: "x"
      },
      {
        feature: "API access",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Third-party tools",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Support & maintenance",
    items: [
      {
        feature: "Community support",
        linearGratis: "check",
        steelSync: "x",
        lindie: "x"
      },
      {
        feature: "Email support",
        linearGratis: "soon",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Priority support",
        linearGratis: "x",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Phone support",
        linearGratis: "x",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "Dedicated account manager",
        linearGratis: "x",
        steelSync: "x",
        lindie: "check"
      },
      {
        feature: "SLA guarantees",
        linearGratis: "x",
        steelSync: "check",
        lindie: "check"
      }
    ]
  },
  {
    category: "Pricing & licensing",
    items: [
      {
        feature: "Free tier available",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Open source",
        linearGratis: "check",
        steelSync: "x",
        lindie: "x"
      },
      {
        feature: "Self-hosting option",
        linearGratis: "check",
        steelSync: "x",
        lindie: "x"
      },
      {
        feature: "No usage limits",
        linearGratis: "check",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Enterprise licensing",
        linearGratis: "x",
        steelSync: "check",
        lindie: "check"
      },
      {
        feature: "Volume discounts",
        linearGratis: "x",
        steelSync: "check",
        lindie: "check"
      }
    ]
  }
]

const FeatureIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'check':
      return <Check className="h-5 w-5 text-green-500" />
    case 'x':
      return <X className="h-5 w-5 text-red-500" />
    case 'soon':
      return <Clock className="h-5 w-5 text-blue-500" />
    default:
      return <X className="h-5 w-5 text-gray-400" />
  }
}

export default function FeaturesPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            Complete feature
            <br />
            <span className="text-primary">comparison</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Detailed feature-by-feature comparison of linear.gratis vs SteelSync vs Lindie for Linear feedback collection.
          </p>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Sticky Header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border border-border rounded-lg mb-8 shadow-lg">
                <div className="grid grid-cols-4 gap-0">
                  <div className="p-6 border-r border-border">
                    <h3 className="text-xl font-bold text-foreground">Feature</h3>
                  </div>
                  <div className="p-6 text-center border-r border-border bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm">
                      <Star className="h-4 w-4" />
                      linear.gratis
                    </div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-primary">$0</div>
                      <p className="text-xs text-muted-foreground">forever</p>
                    </div>
                  </div>
                  <div className="p-6 text-center border-r border-border">
                    <div className="font-bold text-lg">SteelSync</div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-orange-600">$29</div>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                  <div className="p-6 text-center">
                    <div className="font-bold text-lg">Lindie</div>
                    <div className="mt-2">
                      <div className="text-2xl font-bold text-purple-600">$0-99</div>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Categories */}
              {features.map((category, categoryIndex) => (
                <div key={categoryIndex} className="mb-8">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-muted to-muted/50 rounded-lg p-4 mb-4 border-l-4 border-primary">
                    <h4 className="text-lg font-bold capitalize text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      {category.category}
                    </h4>
                  </div>

                  {/* Feature Rows */}
                  <div className="bg-card rounded-lg border border-border overflow-hidden">
                    {category.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`grid grid-cols-4 gap-0 ${itemIndex !== category.items.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}
                      >
                        <div className="p-4 border-r border-border bg-card/50">
                          <span className="font-medium text-foreground">{item.feature}</span>
                        </div>
                        <div className="p-4 text-center border-r border-border bg-gradient-to-br from-primary/5 to-primary/10">
                          <div className="flex items-center justify-center gap-2">
                            <FeatureIcon status={item.linearGratis} />
                            {item.linearGratis === 'soon' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                                Coming soon
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="p-4 text-center border-r border-border">
                          <div className="flex items-center justify-center">
                            <FeatureIcon status={item.steelSync} />
                          </div>
                        </div>
                        <div className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <FeatureIcon status={item.lindie} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Summary Row */}
              <div className="mt-12 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg border-2 border-primary/20 overflow-hidden">
                <div className="grid grid-cols-4 gap-0">
                  <div className="p-6 border-r border-primary/20">
                    <div className="font-bold text-lg">Total monthly savings</div>
                    <p className="text-sm text-muted-foreground">vs competitors</p>
                  </div>
                  <div className="p-6 text-center border-r border-primary/20 bg-primary/20">
                    <div className="text-3xl font-bold text-primary">Free</div>
                    <p className="text-sm font-medium text-primary">Always</p>
                  </div>
                  <div className="p-6 text-center border-r border-primary/20">
                    <div className="text-2xl font-bold text-red-600">-$29</div>
                    <p className="text-sm text-muted-foreground">monthly cost</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="text-2xl font-bold text-red-600">-$30-99</div>
                    <p className="text-sm text-muted-foreground">monthly cost</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Section */}
      <section className="container mx-auto px-6 py-16 bg-muted/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">The linear.gratis advantage</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <Heart className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>$0 today, $0 forever</CardTitle>
                <CardDescription>
                  Start immediately without payment setup. All core features free forever, with advanced features coming soon.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardHeader>
                <Github className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Open source transparency</CardTitle>
                <CardDescription>
                  Community-driven roadmap. See exactly what&apos;s being built and when. Contribute features or self-host.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
              <CardHeader>
                <Clock className="h-10 w-10 text-purple-600 mb-4" />
                <CardTitle>Rapidly evolving</CardTitle>
                <CardDescription>
                  Most &quot;coming soon&quot; features are actively in development. Join our community to prioritise what gets built first.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to start collecting feedback?</h2>
          <p className="text-muted-foreground mb-8">
            Get all the essential features free today, with enterprise features coming soon.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-12 px-8 font-semibold">
              <Link href="/login">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 font-semibold">
              <Link href="/comparison">
                <Github className="mr-2 h-4 w-4" />
                View quick comparison
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}