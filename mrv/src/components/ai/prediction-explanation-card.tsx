"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BrainCircuit, Info, Sparkles } from "lucide-react"
import { explainCarbonPrediction } from "@/ai/flows/ai-carbon-prediction-explanation"

interface PredictionExplanationCardProps {
  data: {
    predictedCarbon: number
    uncertainty: number
    canopyHeight: number
    soilMoisture: number
    tidalConnectivity: number
    sedimentProximity: number
  }
}

export function PredictionExplanationCard({ data }: PredictionExplanationCardProps) {
  const [explanation, setExplanation] = React.useState<string>("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function loadExplanation() {
      try {
        const result = await explainCarbonPrediction(data)
        setExplanation(result)
      } catch (error) {
        console.error("Failed to fetch explanation:", error)
        setExplanation("Analysis unavailable at this time.")
      } finally {
        setLoading(false)
      }
    }
    loadExplanation()
  }, [data])

  const factors = [
    { label: "Canopy Height", value: data.canopyHeight, max: 20, unit: "m", impact: 85 },
    { label: "Soil Moisture", value: data.soilMoisture, max: 100, unit: "%", impact: 62 },
    { label: "Tidal Connectivity", value: data.tidalConnectivity, max: 1, unit: "idx", impact: -45 },
    { label: "Sediment Proximity", value: data.sedimentProximity, max: 1000, unit: "m", impact: 15 },
  ]

  return (
    <Card className="border-border/50 bg-card/40 overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <BrainCircuit className="size-5 text-accent" />
            AI Carbon Prediction Model
          </CardTitle>
          <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
            <Sparkles className="size-3 mr-1" />
            Gemini Powered
          </Badge>
        </div>
        <CardDescription>Explaining factors for {data.predictedCarbon.toLocaleString()} metric tons</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid gap-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Info className="size-3" />
            Key Factor Attribution (SHAP)
          </h4>
          <div className="space-y-5">
            {factors.map((factor) => (
              <div key={factor.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>{factor.label}</span>
                  <span className="font-mono text-muted-foreground">
                    {factor.value}{factor.unit} (Impact: {factor.impact > 0 ? '+' : ''}{factor.impact}%)
                  </span>
                </div>
                <div className="shap-bar-container">
                  <div 
                    className={factor.impact > 0 ? "shap-bar-positive" : "shap-bar-negative"}
                    style={{ 
                      width: `${Math.abs(factor.impact)}%`,
                      marginLeft: factor.impact > 0 ? '50%' : `${50 - Math.abs(factor.impact)}%`
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
          <p className="text-xs font-medium mb-2 flex items-center gap-1 text-accent">
            <Sparkles className="size-3" />
            Natural Language Insight
          </p>
          {loading ? (
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted animate-pulse rounded" />
              <div className="h-2 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "{explanation}"
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

import { Badge } from "@/components/ui/badge"
