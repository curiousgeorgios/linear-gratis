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
import { useT } from '@/lib/i18n/client'

export default function ComparisonPage() {
  const t = useT()

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
            {t("Why choose")}
            <br />
            <span className="text-primary">{t("linear.gratis?")}</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            {t("Compare linear.gratis with SteelSync and Lindie. See why free and open source wins for most teams.")}
          </p>

          <Badge variant="secondary" className="mb-8 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Heart className="h-4 w-4 me-2" />
            {t("Always free, always open")}
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
                  <Star className="h-4 w-4 me-1" />
                  {t("Recommended")}
                </Badge>
              </div>
              <CardHeader className="text-center pt-8">
                <CardTitle className="text-2xl mb-2">{t("linear.gratis")}</CardTitle>
                <CardDescription className="text-lg">{t("Free forever")}</CardDescription>
                <div className="text-4xl font-bold text-primary mt-4">$0</div>
                <p className="text-sm text-muted-foreground">{t("per month, always")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Client feedback forms")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Direct Linear integration")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Unlimited forms & submissions")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("No email chaos")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Github className="h-5 w-5 text-primary" />
                    <span>{t("Open source & transparent")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>{t("Community supported")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Shareable Linear views & roadmaps")}</span>
                  </div>
                </div>

                <Button asChild className="w-full h-12 font-semibold mt-6">
                  <Link href="/login">
                    {t("Get started free")}
                    <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* SteelSync */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">{t("SteelSync")}</CardTitle>
                <CardDescription>{t("Public boards & AI changelogs")}</CardDescription>
                <div className="text-4xl font-bold mt-4">{t("Free+")}</div>
                <p className="text-sm text-muted-foreground">{t("paid tiers available")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Public/private boards")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("AI-generated changelogs")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Real-time Linear sync")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Client request automation")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-orange-500" />
                    <span>{t("Advanced features require payment")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <span>{t("Closed source")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-sm">{t("Best for agencies needing AI changelogs")}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-12 font-semibold mt-6" asChild>
                  <a href="https://steelsync.io" target="_blank" rel="noopener noreferrer">
                    {t("Visit SteelSync")}
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Lindie */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">{t("Lindie")}</CardTitle>
                <CardDescription>{t("Linear's collaboration companion")}</CardDescription>
                <div className="text-4xl font-bold mt-4">{t("Free+")}</div>
                <p className="text-sm text-muted-foreground">{t("paid tiers available")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Private read-only links")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Magic Summary feature")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Status change notifications")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-500" />
                    <span>{t("Real-time sync")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-orange-500" />
                    <span>{t("Up to 10 users on free tier")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-gray-500" />
                    <span>{t("Closed source")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-sm">{t("Best for client collaboration")}</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full h-12 font-semibold mt-6" asChild>
                  <a href="https://lindie.app" target="_blank" rel="noopener noreferrer">
                    {t("Visit Lindie")}
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why linear.gratis wins */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">{t("Why linear.gratis wins for most teams")}</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <Heart className="h-10 w-10 text-green-600 mb-4" />
                <CardTitle>{t("No barriers to entry")}</CardTitle>
                <CardDescription>
                  {t("Start using Linear feedback forms immediately. No credit cards, no free trials that expire, no feature limitations.")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardHeader>
                <Github className="h-10 w-10 text-blue-600 mb-4" />
                <CardTitle>{t("Open source transparency")}</CardTitle>
                <CardDescription>
                  {t("See exactly how your data is handled. Contribute features. No vendor lock-in or surprise pricing changes.")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
              <CardHeader>
                <Users className="h-10 w-10 text-purple-600 mb-4" />
                <CardTitle>{t("Perfect for small teams")}</CardTitle>
                <CardDescription>
                  {t("Solo developers and startups shouldn't pay enterprise prices for basic feedback collection. linear.gratis levels the playing field.")}
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
              <CardHeader>
                <Unlock className="h-10 w-10 text-orange-600 mb-4" />
                <CardTitle>{t("Community driven")}</CardTitle>
                <CardDescription>
                  {t("Features are built based on real user needs, not corporate roadmaps. Join our community and help shape the future.")}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* When to consider alternatives */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">{t("When to consider alternatives")}</h2>
          <p className="text-center text-muted-foreground mb-12">
            {t("Honesty first: linear.gratis isn't perfect for everyone. Here's when you might need something else.")}
          </p>

          <div className="space-y-6">
            <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  {t("Choose SteelSync if...")}
                </h3>
                <p className="text-muted-foreground">
                  {t("You need AI-generated changelogs, automated client request workflows, and advanced public board customisation for your agency.")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  {t("Choose Lindie if...")}
                </h3>
                <p className="text-muted-foreground">
                  {t("You need Magic Summary overviews, automated status notifications, and a polished UI for sharing Linear projects with clients.")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  {t("Choose linear.gratis if...")}
                </h3>
                <p className="text-muted-foreground">
                  {t("You want to collect client feedback in Linear without barriers, prefer open source solutions, or you're tired of paying for basic features that should be free.")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t("Ready to try the free alternative?")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("Join hundreds of developers who've chosen linear.gratis for their Linear feedback collection.")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="h-12 px-8 font-semibold">
              <Link href="/login">
                {t("Start collecting feedback free")}
                <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 font-semibold">
              <Link href="/features">
                {t("View detailed feature comparison")}
                <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}