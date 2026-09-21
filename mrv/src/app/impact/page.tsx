
"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Fish, Users, Landmark, MapPin, Shield, Loader2, Info } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { MOCK_PROJECTS } from "@/lib/mock-data"

export default function ImpactPage() {
  const firestore = useFirestore()
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore) return null
    return collection(firestore, "projects")
  }, [firestore])

  const { data: dbProjects, isLoading: loading } = useCollection(projectsQuery)

  const displayProjects = React.useMemo(() => {
    if (dbProjects && dbProjects.length > 0) return dbProjects;
    return MOCK_PROJECTS;
  }, [dbProjects]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 backdrop-blur-md bg-background/50 sticky top-0 z-30">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-headline font-bold text-xl uppercase tracking-tight text-primary">UAE Registry Impact</h1>
        </header>
        
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-headline font-bold text-primary">Registry Impact Monitoring</h2>
              <p className="text-muted-foreground">Quantifying social and environmental benefits across coastal nodes.</p>
            </div>
            {loading && <Loader2 className="size-6 animate-spin text-accent" />}
          </div>

          {!loading && dbProjects?.length === 0 && (
            <Card className="bg-accent/5 border-accent/20 border-dashed">
              <CardContent className="flex items-center gap-3 py-4">
                <Info className="size-4 text-accent" />
                <p className="text-xs font-medium text-accent italic">
                  Note: Real-time project data is unavailable. Displaying baseline impact simulations for UAE National Program areas.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayProjects.map((project: any) => (
              <Card key={project.id} className="border-border/50 bg-card/40 flex flex-col hover:border-accent/50 transition-all group overflow-hidden shadow-sm">
                <CardHeader className="pb-4 bg-muted/5 border-b mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-tighter bg-primary/5">Zone Impact Report</Badge>
                    <Shield className="size-4 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="font-headline text-lg group-hover:text-accent transition-colors">{project.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="size-3" /> UAE Coastal Node: {project.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Fish className="size-4 text-blue-500" />
                        Fish Nursery Score
                      </div>
                      <span className="text-sm font-bold">{project.fishNurseryScore || 0}%</span>
                    </div>
                    <Progress value={project.fishNurseryScore || 0} className="h-1.5" />
                  </div>

                  <Separator className="bg-border/30" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                        <Users className="size-3" /> Communities
                      </div>
                      <p className="text-xs font-semibold">{project.communities?.length || 0} Benefited</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.communities?.slice(0, 1).map((c: string) => (
                          <Badge key={c} variant="secondary" className="text-[9px] h-4">{c}</Badge>
                        ))}
                        {(project.communities?.length || 0) > 1 && <span className="text-[9px] text-muted-foreground">+{(project.communities?.length || 0) - 1} more</span>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold">
                        <Landmark className="size-3" /> Heritage
                      </div>
                      <p className="text-xs font-semibold">{(project.heritageSites?.length || 0) > 0 ? project.heritageSites?.length : 'None'} Protected</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.heritageSites?.slice(0, 1).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-[9px] h-4">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Community Access Status</p>
                      <p className="text-sm font-medium text-primary">{project.accessStatus || 'Evaluating Access'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
