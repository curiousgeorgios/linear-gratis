'use client'

import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  Heart,
  Github,
  Users,
  DollarSign,
  Lock,
  Unlock,
  Star,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

export default function ComparisonPage() {
  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            Why choose
            <br />
            <span className="text-primary">linear.gratis?</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Compare linear.gratis with SteelSync and Lindie. See why free and open source wins for most teams.
          </p>

          <Badge variant="secondary" className="mb-8 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Heart className="h-4 w-4 mr-2" />
            Always free, always open
          </Badge>
        </div>
      </section>

      {/* Main Comparison Table */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">

            {/* linear.gratis */}
            <Card className="border-primary/50 bg-gradient-to-b from-primary/5 to-background shadow-xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground px-4 py-1">
                  <Star className="h-4 w-4 mr-1" />
                  Recommended
                </Badge>
              </div>
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl mb-2">linear.gratis</CardTitle>
                <CardDescription className="text-lg">Free forever</CardDescription>
                <div className="text-4xl font-bold text-primary mt-4">$0</div>
                <p className="text-sm text-muted-foreground">per month, always</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Client feedback forms</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Direct Linear integration</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Unlimited forms & submissions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>No email chaos</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-primary" />
                    <span>Open source & transparent</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>Community supported</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Badge variant="outline" className="text-xs">Coming soon</Badge>
                    <span>Shareable Linear views</span>
                  </div>
                </div>

                <Button asChild className="w-full h-12 font-semibold mt-6">
                  <Link href="/login">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* SteelSync */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">SteelSync</CardTitle>
                <CardDescription>Public roadmaps focused</CardDescription>
                <div className="text-4xl font-bold mt-4">$29</div>
                <p className="text-sm text-muted-foreground">per month</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Public/private roadmaps</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>AI-generated changelogs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Real-time Linear sync</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Client request automation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                    <span>Monthly subscription required</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <span>Closed source</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-sm">Best for agencies needing advanced roadmap features</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-12 font-semibold mt-6" disabled>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Paid plans only
                </Button>
              </CardContent>
            </Card>

            {/* Lindie */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Lindie</CardTitle>
                <CardDescription>Enterprise sharing</CardDescription>
                <div className="text-4xl font-bold mt-4">$0-99</div>
                <p className="text-sm text-muted-foreground">per month</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Private read-only links</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Domain/label restrictions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Custom branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>Real-time sync</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-orange-500" />
                    <span>Large teams & agencies focus</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <span>Closed source</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-sm">Best for enterprise security needs</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-12 font-semibold mt-6" disabled>
                  <Lock className="mr-2 h-4 w-4" />
                  Contact for pricing
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why linear.gratis wins */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why linear.gratis wins for most teams</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <Heart className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>No barriers to entry</CardTitle>
                <CardDescription>
                  Start using Linear feedback forms immediately. No credit cards, no free trials that expire, no feature limitations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardHeader>
                <Github className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>Open source transparency</CardTitle>
                <CardDescription>
                  See exactly how your data is handled. Contribute features. No vendor lock-in or surprise pricing changes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mb-4" />
                <CardTitle>Perfect for small teams</CardTitle>
                <CardDescription>
                  Solo developers and startups shouldn&apos;t pay enterprise prices for basic feedback collection. linear.gratis levels the playing field.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
              <CardHeader>
                <Unlock className="h-10 w-10 text-orange-600 mb-4" />
                <CardTitle>Community driven</CardTitle>
                <CardDescription>
                  Features are built based on real user needs, not corporate roadmaps. Join our community and help shape the future.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* When to consider alternatives */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">When to consider alternatives</h2>
          <p className="text-center text-muted-foreground mb-12">
            Honesty first: linear.gratis isn&apos;t perfect for everyone. Here&apos;s when you might need something else.
          </p>

          <div className="space-y-6">
            <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  Choose SteelSync if...
                </h3>
                <p className="text-muted-foreground">
                  You&apos;re an agency that needs AI-generated changelogs, advanced public roadmap customisation, and don&apos;t mind paying $29/month for premium features.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Choose Lindie if...
                </h3>
                <p className="text-muted-foreground">
                  You need advanced features like analytics, magic summary, and visibility rules, and can justify $50-99/month for enterprise-level Linear sharing capabilities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  Choose linear.gratis if...
                </h3>
                <p className="text-muted-foreground">
                  You want to collect client feedback in Linear without barriers, prefer open source solutions, or you&apos;re tired of paying for basic features that should be free.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to try the free alternative?</h2>
          <p className="text-muted-foreground mb-8">
            Join hundreds of developers who&apos;ve chosen linear.gratis for their Linear feedback collection.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-12 px-8 font-semibold">
              <Link href="/login">
                Start collecting feedback free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 font-semibold">
              <Link href="/features">
                View detailed feature comparison
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}