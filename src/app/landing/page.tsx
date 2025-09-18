'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import {
  ArrowRight,
  Check,
  Github,
  Star,
  Users,
  MessageSquare,
  Share2,
  Zap,
  Shield,
  Heart,
  ChevronRight,
  Calendar,
  BarChart3,
  Settings
} from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  const [formData, setFormData] = useState({
    customerName: 'Sarah Chen',
    customerEmail: 'sarah@acme.com',
    issueTitle: 'Feature request: Dark mode support',
    issueBody: 'Our team would love to see dark mode support in the dashboard. This would help reduce eye strain during late-night work sessions and align with our design system.'
  })

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-8 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Github className="h-4 w-4 mr-2" />
            Free & Open Source
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            Linear integration
            <br />
            <span className="text-primary">made simple</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Streamline your customer feedback workflow with seamless Linear integration.
            Create customer requests, share issue boards, and keep your team in sync.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/">
              <Button size="lg" className="h-12 px-8 font-semibold">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-12 px-8 font-semibold">
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </Button>
          </div>

          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>Open Source</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <span>Community Driven</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Always Free</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">See it in action</h2>
            <p className="text-muted-foreground text-lg">
              Create customer requests directly from your feedback forms
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Form Preview */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl">Customer request form</CardTitle>
                <CardDescription>
                  Your customers submit feedback through a clean, simple form
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Customer name</label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Issue title</label>
                  <Input
                    value={formData.issueTitle}
                    onChange={(e) => setFormData({...formData, issueTitle: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.issueBody}
                    onChange={(e) => setFormData({...formData, issueBody: e.target.value})}
                    className="mt-1 min-h-[100px]"
                  />
                </div>
                <Button className="w-full h-11 font-medium">
                  Submit request
                </Button>
              </CardContent>
            </Card>

            {/* Linear Integration Preview */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-sm"></div>
                  </div>
                  Linear issue created
                </CardTitle>
                <CardDescription>
                  Automatically synced to your Linear workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                      Customer Request
                    </Badge>
                    <span className="text-sm text-muted-foreground">2 minutes ago</span>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">{formData.issueTitle}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {formData.issueBody}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          SC
                        </div>
                        <span>{formData.customerName}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {formData.customerEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Comment
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg">
              Powerful features to streamline your customer feedback workflow
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Instant sync</CardTitle>
                <CardDescription>
                  Customer requests appear in Linear immediately with all context preserved
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <Settings className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Custom forms</CardTitle>
                <CardDescription>
                  Create shareable forms with pre-defined projects and custom fields
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Secure by design</CardTitle>
                <CardDescription>
                  Your API tokens are encrypted and stored securely with industry standards
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400">
              Coming Soon
            </Badge>
            <h2 className="text-3xl font-bold mb-4">What&apos;s next</h2>
            <p className="text-muted-foreground text-lg">
              Exciting features in development to make your workflow even better
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Share2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <CardTitle>Shareable issue boards</CardTitle>
                    <CardDescription>
                      Create public dashboards to keep customers updated on request status
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <div className="text-sm text-muted-foreground mb-2">Feature preview</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Share board links with customers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Real-time status updates</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Custom branding options</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-green-500" />
                  <div>
                    <CardTitle>Analytics dashboard</CardTitle>
                    <CardDescription>
                      Track request patterns, response times, and customer satisfaction
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <div className="text-sm text-muted-foreground mb-2">Feature preview</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Request volume trends</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Customer satisfaction metrics</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Team performance insights</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-12 border border-primary/20">
            <Github className="h-16 w-16 mx-auto mb-6 text-primary" />
            <h2 className="text-3xl font-bold mb-4">Built in the open</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Linear Integration is completely free and open source. Built by the community, for the community.
              No hidden costs, no vendor lock-in, no surprises.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold mb-1">Always free</h3>
                <p className="text-sm text-muted-foreground">No pricing tiers or usage limits</p>
              </div>
              <div className="text-center">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold mb-1">Self-hostable</h3>
                <p className="text-sm text-muted-foreground">Deploy on your own infrastructure</p>
              </div>
              <div className="text-center">
                <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h3 className="font-semibold mb-1">Community driven</h3>
                <p className="text-sm text-muted-foreground">Built with feedback from users like you</p>
              </div>
            </div>

            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold">
              <Github className="mr-2 h-5 w-5" />
              Contribute on GitHub
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to streamline your workflow?
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Start creating Linear customer requests in minutes. No setup required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" className="h-14 px-10 text-lg font-semibold">
                Get started now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-14 px-10 text-lg font-semibold">
              <Calendar className="mr-2 h-5 w-5" />
              Schedule demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h3 className="text-xl font-semibold mb-2">Linear Integration</h3>
                <p className="text-muted-foreground">Free & open source Linear integration tool</p>
              </div>

              <div className="flex items-center gap-6">
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-5 w-5" />
                </Link>
                <span className="text-muted-foreground">Made with ❤️ by the community</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}