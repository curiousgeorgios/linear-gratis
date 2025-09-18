'use client'

import { useAuth } from "@/contexts/auth-context"
import { LinearIssueForm } from "@/components/linear-issue-form"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Github,
  Star,
  Users,
  MessageSquare,
  Share2,
  Zap,
  Shield,
  Heart,
  ChevronRight,
  Settings
} from "lucide-react"
import Link from "next/link"
import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
  const { user, loading } = useAuth()
  const [formData, setFormData] = useState({
    customerName: 'Sarah Chen',
    customerEmail: 'sarah@acme.com',
    issueTitle: 'Feature request: Dark mode support',
    issueBody: 'Our team would love to see dark mode support in the dashboard. This would help reduce eye strain during late-night work sessions and align with our design system.'
  })

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Loading...</h2>
            <p className="text-muted-foreground">Please wait while we load your account.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
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
              Linear for
              <br />
              <span className="text-primary">everyone</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Collect client feedback directly into Linear without being limited to Slack or email.
              Make your product development transparent and collaborative.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/login">
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
              <h2 className="text-3xl font-bold mb-4">Beyond Slack and email</h2>
              <p className="text-muted-foreground text-lg">
                Give your clients a direct line to your product roadmap
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Form Preview */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle className="text-xl">Client feedback form</CardTitle>
                  <CardDescription>
                    No more scattered feedback in Slack or email threads
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
              <h2 className="text-3xl font-bold mb-4">Make Linear accessible</h2>
              <p className="text-muted-foreground text-lg">
                Break down barriers between your team and your clients
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>No more email chaos</CardTitle>
                  <CardDescription>
                    Client feedback goes directly into Linear - no copy-pasting from scattered messages
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Settings className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Shareable forms</CardTitle>
                  <CardDescription>
                    Create branded feedback forms your clients actually want to use
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Always free</CardTitle>
                  <CardDescription>
                    No premium tiers, no usage limits. Making Linear accessible shouldn&apos;t cost anything
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
              <h2 className="text-3xl font-bold mb-4">True transparency</h2>
              <p className="text-muted-foreground text-lg">
                Let your clients see exactly where their feedback stands
              </p>
            </div>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Share2 className="h-8 w-8 text-blue-500" />
                  <div>
                    <CardTitle>Shareable Linear views</CardTitle>
                    <CardDescription>
                      Share your Linear boards directly with clients - no more status update emails
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 border border-border/50">
                  <div className="text-sm text-muted-foreground mb-4">Preview: What your clients will see</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-card rounded border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="font-medium">Dark mode support</span>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
                        In Progress
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card rounded border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium">Mobile responsive design</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400">
                        Completed
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-card rounded border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">Better search functionality</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400">
                        Planned
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    Public board • Updated 2 hours ago • linear.gratis/board/acme-feedback
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Choose linear.gratis */}
        <section className="container mx-auto px-6 py-16 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why choose linear.gratis?</h2>
              <p className="text-muted-foreground text-lg">
                The free, open source alternative to paid Linear feedback tools
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">$0 forever</h3>
                  <p className="text-sm text-muted-foreground">
                    Unlike SteelSync ($29/month) or Lindie ($0-99/month), linear.gratis is completely free
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Github className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Open source</h3>
                  <p className="text-sm text-muted-foreground">
                    Transparent code you can trust. No vendor lock-in or hidden tracking
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">For everyone</h3>
                  <p className="text-sm text-muted-foreground">
                    Perfect for solo developers and small teams who can&apos;t justify enterprise pricing
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center space-x-4">
              <Button asChild variant="outline" size="lg" className="h-12 px-8 font-semibold">
                <Link href="/comparison">
                  Compare with SteelSync & Lindie
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="h-12 px-8 font-semibold">
                <Link href="/features">
                  View detailed feature table
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-12 border border-primary/20">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Github className="h-16 w-16 text-primary" />
                <div className="text-4xl font-bold text-primary">.gratis</div>
              </div>
              <h2 className="text-3xl font-bold mb-4">Free. Forever. For everyone.</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                The domain says it all - linear.gratis means making Linear accessible to everyone
                without barriers. No hidden costs, no premium features, no limits.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <h3 className="font-semibold mb-1">Always gratis</h3>
                  <p className="text-sm text-muted-foreground">Linear shouldn&apos;t be limited to big teams</p>
                </div>
                <div className="text-center">
                  <Github className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold mb-1">Open source</h3>
                  <p className="text-sm text-muted-foreground">Transparent, community-driven development</p>
                </div>
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold mb-1">For everyone</h3>
                  <p className="text-sm text-muted-foreground">Solo developers to enterprise teams</p>
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

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0">
                  <h3 className="text-xl font-semibold mb-2">linear.gratis</h3>
                  <p className="text-muted-foreground">Making Linear accessible to everyone</p>
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

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />
      <div className="container mx-auto px-6 py-12">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Linear integration
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Streamline your workflow with seamless Linear integration. Create customer requests and manage custom forms effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/20">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Create customer request</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Submit a one-off customer request to Linear directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full h-11 font-medium">
                  <Link href="#form">Use quick form below</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/20">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Manage custom forms</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Create shareable forms with pre-defined projects and titles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full h-11 font-medium">
                  <Link href="/forms">Manage forms</Link>
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>

        <div id="form" className="max-w-2xl mx-auto">
          <LinearIssueForm />
        </div>
      </div>
    </div>
  )
}
