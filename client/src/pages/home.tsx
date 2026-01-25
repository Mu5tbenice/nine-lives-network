import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Server, Zap, Shield, Code } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4" data-testid="text-title">
            Node.js Express Server
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-description">
            Your full-stack application is ready. Built with Express, React, and TypeScript.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Fast & Modern</CardTitle>
              <CardDescription>
                Powered by Vite for lightning-fast development with hot module replacement.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Type Safe</CardTitle>
              <CardDescription>
                Full TypeScript support across frontend and backend for reliable code.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-2">
                <Code className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Ready to Build</CardTitle>
              <CardDescription>
                Pre-configured with Tailwind CSS, Shadcn UI, and React Query.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" data-testid="button-get-started">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
