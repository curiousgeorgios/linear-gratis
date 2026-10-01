"use client";

import { useAuth } from "@/contexts/auth-context";
import { LinearIssueForm } from "@/components/linear-issue-form";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Github,
  Users,
  MessageSquare,
  Share2,
  Zap,
  Shield,
  Heart,
  ChevronRight,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MetricsBar } from "@/components/metrics-bar";
import { FAQ } from "@/components/faq";
import { GitHubStars, GitHubStatsBar } from "@/components/github-stats";
import { ProductPreview } from "@/components/product-preview";
import { KanbanMockup } from "@/components/mockups/kanban-mockup";
import { useT } from '@/lib/i18n/client'

export default function Home() {
  const t = useT()

  const { user, loading } = useAuth();
  const [formData, setFormData] = useState({
    customerName: "Sarah Chen",
    customerEmail: "sarah@acme.com",
    issueTitle: "Feature request: Dark mode support",
    issueBody:
      "Our team would love to see dark mode support in the dashboard. This would help reduce eye strain during late-night work sessions and align with our design system.",
  });

  // Check if user has Linear API token set up (server-side, never exposes
  // the token itself to the browser).
  const [hasLinearToken, setHasLinearToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkLinearToken = async () => {
      try {
        const response = await fetch("/api/profile/linear-token", {
          method: "GET",
        });
        if (!response.ok) {
          setHasLinearToken(false);
          return;
        }
        const data = (await response.json()) as { hasToken?: boolean };
        setHasLinearToken(Boolean(data.hasToken));
      } catch (error) {
        console.error("Error checking Linear token:", error);
        setHasLinearToken(false);
      }
    };

    checkLinearToken();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{t("Loading...")}</h2>
            <p className="text-muted-foreground">
              {t("Please wait while we load your account.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navigation />

        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-24 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge
                variant="secondary"
                className="mb-8 px-4 py-2 bg-primary/10 text-primary border-primary/20"
              >
                <Github className="h-4 w-4 me-2" />
                {t("Free & Open Source")}
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent leading-tight">
                {t("Share Linear with clients.")}
                <br />
                <span className="text-primary">{t("No seats required.")}</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                {t("Real-time project boards and feedback forms that connect directly to Linear.")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="h-14 px-10 text-lg font-semibold"
                  >
                    {t("Start free")}
                    <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-10 text-lg font-semibold"
                  >
                    {t("View demo")}
                    <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Product Preview */}
            <div className="mb-12">
              <ProductPreview>
                <KanbanMockup />
              </ProductPreview>
            </div>

            {/* Metrics Bar */}
            <MetricsBar />

            {/* Problem/Solution */}
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {t("The problem")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>
                      {t("Clients constantly ask \"what's the status?\" - wasting hours on status update emails")}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Customer feedback scattered across Slack, email, and support tools")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Manual copy-pasting from messages into Linear is tedious")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Can't afford Linear seats for every client and stakeholder")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-400 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    {t("The solution")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Share live Linear boards - clients see real-time progress without seats")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Feedback forms automatically create Linear issues with full context")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Password-protect sensitive views for client privacy")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Zero manual work - everything is automated and real-time")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-6 py-20 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("Two ways to make Linear accessible")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t("Share your Linear workspace with the world in minutes - no technical setup required")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Public Views */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="blue">
                      {t("Live now")}
                    </Badge>
                    <Share2 className="h-8 w-8 text-blue-500" />
                  </div>
                  <CardTitle className="text-2xl mb-2">{t("Public read-only views")}</CardTitle>
                  <CardDescription className="text-base">
                    {t("Share live Linear boards with clients, stakeholders, and users")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Beautiful Kanban board view of your Linear projects or teams")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Real-time updates - no manual refreshing needed")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Filter by status, assignee, priority, and labels")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Optional password protection for sensitive projects")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Allow viewers to create issues directly from the board")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback Forms */}
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="green">
                      {t("Live now")}
                    </Badge>
                    <MessageSquare className="h-8 w-8 text-green-500" />
                  </div>
                  <CardTitle className="text-2xl mb-2">{t("Customer feedback forms")}</CardTitle>
                  <CardDescription className="text-base">
                    {t("Let anyone submit feedback directly to your Linear projects")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Custom forms for different Linear projects and use cases")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Submissions automatically create Linear issues with full context")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Support for attachments, reference IDs, and custom fields")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Prefill form fields via URL for specific customers")}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p>{t("Perfect for support requests, bug reports, and feature requests")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 font-semibold">
                  {t("Start sharing your Linear - it's free")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Live Demo Section */}
        <section id="demo" className="container mx-auto px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("See it in action")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                {t("Watch how a customer form submission automatically becomes a trackable Linear issue - zero manual work required")}
              </p>
            </div>

            <div className="relative">
              {/* Minimalistic arrow connector */}
              <div className="hidden lg:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="flex items-center">
                  <ArrowRight className="h-6 w-6 text-primary rtl:-scale-x-100" />
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Customer Side */}
                <div className="space-y-4">
                  <div className="text-center lg:text-start">
                    <h3 className="text-xl font-semibold mb-2">
                      {t("What your customers see")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("A clean, branded form that's easy to fill out")}
                    </p>
                  </div>

                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>{t("your-form-url.com/support")}</span>
                      </div>
                      <CardTitle className="text-lg">
                        {t("Submit a support request")}
                      </CardTitle>
                      <CardDescription>
                        {t("Help us resolve your issue quickly by providing detailed information")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">
                            {t("Customer name")}
                          </label>
                          <Input
                            value={formData.customerName}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customerName: e.target.value,
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">{t("Email")}</label>
                          <Input
                            value={formData.customerEmail}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customerEmail: e.target.value,
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          {t("Issue title")}
                        </label>
                        <Input
                          value={formData.issueTitle}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              issueTitle: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          {t("Description")}
                        </label>
                        <Textarea
                          value={formData.issueBody}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              issueBody: e.target.value,
                            })
                          }
                          className="mt-1 min-h-[100px]"
                        />
                      </div>
                      <Button className="w-full h-11 font-medium">
                        {t("Submit request")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Team Side */}
                <div className="space-y-4">
                  <div className="text-center lg:text-start">
                    <h3 className="text-xl font-semibold mb-2">
                      {t("What your team sees")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("A properly formatted Linear issue with all context")}
                    </p>
                  </div>

                  <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span>{t("Linear • Support Project")}</span>
                      </div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {t("Issue automatically created")}
                      </CardTitle>
                      <CardDescription>
                        {t("Ready for your team to prioritise and assign")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="green">
                            {t("Customer Request")}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {t("Just now")}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">
                            {formData.issueTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {formData.issueBody}
                          </p>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {t("SC")}
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
                            <MessageSquare className="h-4 w-4 me-2" />
                            {t("Comment")}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 me-2" />
                            {t("Assign")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 font-semibold">
                  {t("Set this up for your team")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                {t("Everything you need for client transparency")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t("From live progress tracking to feedback collection - all in one place")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Share2 className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Live board sharing")}</CardTitle>
                  <CardDescription>
                    {t("Share real-time Kanban views of your Linear projects - no more \"what's the status?\" emails")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <MessageSquare className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Feedback forms")}</CardTitle>
                  <CardDescription>
                    {t("Custom forms that automatically create Linear issues - stop copy-pasting from Slack and email")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Secure & private")}</CardTitle>
                  <CardDescription>
                    {t("Password-protect sensitive views, encrypted API tokens, and full control over what's shared")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Settings className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Powerful filtering")}</CardTitle>
                  <CardDescription>
                    {t("Filter public views by status, assignee, priority, labels - give stakeholders exactly what they need")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Zap className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Zero setup time")}</CardTitle>
                  <CardDescription>
                    {t("Connect your Linear API token and start sharing in under 2 minutes - no complex configuration")}
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <Heart className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{t("Always free")}</CardTitle>
                  <CardDescription>
                    {t("No premium tiers, no usage limits, no credit card. Making Linear accessible shouldn't cost anything")}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("Perfect for")}</h2>
              <p className="text-muted-foreground text-lg">
                {t("Whether you're an agency, indie hacker, or product team - make Linear work for your needs")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <Users className="h-10 w-10 text-blue-500 mb-3" />
                  <CardTitle className="text-xl">{t("Agencies & consultancies")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">{t("Share project progress")}</strong> {t("with clients in real-time without endless status emails")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("Collect client feedback")}</strong> {t("directly into your Linear workspace")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("Professional client portal")}</strong> {t("without building custom software")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <Heart className="h-10 w-10 text-red-500 mb-3" />
                  <CardTitle className="text-xl">{t("Solo devs & indie hackers")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">{t("Public roadmaps")}</strong> {t("to keep your users in the loop")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("Feature request forms")}</strong> {t("that go directly to Linear")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("$0 cost")}</strong> {t("- because you can't afford enterprise pricing yet")}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <Zap className="h-10 w-10 text-yellow-500 mb-3" />
                  <CardTitle className="text-xl">{t("Product & engineering teams")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">{t("Customer support portal")}</strong> {t("for direct feedback submission")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("Stakeholder dashboards")}</strong> {t("for non-technical team members")}
                  </p>
                  <p>
                    <strong className="text-foreground">{t("Bug report forms")}</strong> {t("that skip the support ticket queue")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Choose linear.gratis */}
        <section className="container mx-auto px-6 py-16 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                {t("Why choose linear.gratis?")}
              </h2>
              <p className="text-muted-foreground text-lg">
                {t("The complete Linear transparency platform - free, open source, and built for everyone")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("$0 forever")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Unlike paid alternatives (SteelSync, Lindie, etc.), linear.gratis gives you everything for free - forms, views, and transparency")}
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Github className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("Open source")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Transparent code you can trust. No vendor lock-in or hidden tracking")}
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{t("For everyone")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Perfect for solo developers and small teams who can't justify enterprise pricing")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="text-center space-x-4">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 font-semibold"
              >
                <Link href="/comparison">
                  {t("Compare with SteelSync & Lindie")}
                  <ChevronRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 px-8 font-semibold"
              >
                <Link href="/features">
                  {t("View detailed feature table")}
                  <ChevronRight className="ms-2 h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("Frequently asked questions")}</h2>
              <p className="text-muted-foreground text-lg">
                {t("Everything you need to know about linear.gratis")}
              </p>
            </div>
            <FAQ />
          </div>
        </section>

        {/* Open Source Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl p-12 border border-primary/20">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Github className="h-16 w-16 text-primary" />
                <div className="text-4xl font-bold text-primary">{t(".gratis")}</div>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                {t("Free. Forever. For everyone.")}
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                {t("The domain says it all - linear.gratis means making Linear accessible to everyone without barriers. No hidden costs, no premium features, no limits.")}
              </p>

              {/* GitHub Stats */}
              <div className="mb-8">
                <GitHubStatsBar />
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <h3 className="font-semibold mb-1">{t("Always gratis")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Linear shouldn't be limited to big teams")}
                  </p>
                </div>
                <div className="text-center">
                  <Github className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <h3 className="font-semibold mb-1">{t("Open source")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Transparent, open source development")}
                  </p>
                </div>
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <h3 className="font-semibold mb-1">{t("For everyone")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t("Solo developers to enterprise teams")}
                  </p>
                </div>
              </div>

              <GitHubStars />
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("Ready to share Linear with your clients?")}
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              {t("Get started in under 2 minutes. No credit card required.")}
            </p>
            <Link href="/login">
              <Button size="lg" className="h-14 px-10 text-lg font-semibold">
                {t("Start free")}
                <ArrowRight className="ms-2 h-5 w-5 rtl:-scale-x-100" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-6 md:mb-0">
                  <h3 className="text-xl font-semibold mb-2">{t("linear.gratis")}</h3>
                  <p className="text-muted-foreground">
                    {t("Making Linear accessible to everyone")}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <Link
                    href="https://github.com/curiousgeorgios/linear-gratis"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="h-5 w-5" />
                  </Link>
                  <span className="text-muted-foreground">
                    {t("Made with ❤️ by")}{" "}
                    <Link
                      href="https://curiousgeorge.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      {t("curiousgeorge.dev")}
                    </Link>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (hasLinearToken === null) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">{t("Loading...")}</h2>
            <p className="text-muted-foreground">
              {t("Checking your Linear configuration...")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasLinearToken) {
    return (
      <div className="min-h-screen gradient-bg">
        <Navigation />
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                {t("Welcome to Linear integration")}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t("Let's get you set up to start collecting customer feedback directly in Linear.")}
              </p>
            </div>

            {/* Setup Flow */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg mb-8">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  {t("Set up your Linear API token")}
                </CardTitle>
                <CardDescription className="text-base">
                  {t("This is the first step to connect your Linear workspace with our integration.")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                  <h3 className="font-semibold mb-2">
                    {t("How to get your Linear API token:")}
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>{t("Go to Linear → Settings → API")}</li>
                    <li>{t("Click \"Create personal API key\"")}</li>
                    <li>{t("Give it a name like \"Linear Integration\"")}</li>
                    <li>{t("Copy the generated token")}</li>
                  </ol>
                </div>

                <div className="flex justify-center">
                  <Button asChild size="lg" className="h-12 px-8 font-semibold">
                    <Link href="/profile">{t("Set up Linear API token")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* What's Next Preview */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg opacity-60">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted-foreground text-background rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  {t("What you'll be able to do next")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
                    <h4 className="font-semibold mb-2">
                      {t("Quick customer requests")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t("Submit one-off customer requests directly to Linear")}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
                    <h4 className="font-semibold mb-2">{t("Shareable forms")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("Create branded forms for specific projects that customers can use")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <Navigation />
      <div className="container mx-auto px-6 py-12">
        {/* Hero section */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {t("Linear integration")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("Your Linear API token is configured! Now you can create customer requests and manage custom forms effortlessly.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/20">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">
                  {t("Create customer request")}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("Submit a one-off customer request to Linear directly")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full h-11 font-medium">
                  <Link href="#form">{t("Use quick form below")}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:border-primary/20">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">{t("Manage custom forms")}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {t("Create shareable forms with pre-defined projects and titles")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 font-medium"
                >
                  <Link href="/forms">{t("Manage forms")}</Link>
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
  );
}
