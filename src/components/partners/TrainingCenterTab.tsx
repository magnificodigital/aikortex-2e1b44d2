import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { type Course } from "@/types/partner";
import { BookOpen, Clock, Award, Play, Search, Filter } from "lucide-react";
import { toast } from "sonner";

const MOCK_COURSES: Course[] = [
  { id: "1", title: "Automação IA — Fundamentos", description: "Aprenda a criar automações inteligentes com IA generativa", category: "Automação IA", lessons: 12, duration: "4h 30min", certification: "AI Automation Specialist", progress: 75, status: "in_progress" },
  { id: "2", title: "Construindo Agentes de IA", description: "Do zero ao deploy de agentes autônomos", category: "Agentes de IA", lessons: 18, duration: "8h", certification: "AI Agent Builder", progress: 0, status: "not_started" },
  { id: "3", title: "CRM com IA — Implementação", description: "Implemente CRMs inteligentes para seus clientes", category: "CRM", lessons: 10, duration: "3h 45min", certification: "CRM Implementation Expert", progress: 100, status: "completed" },
  { id: "4", title: "Marketing com Automação", description: "Estratégias de marketing automatizado com IA", category: "Marketing", lessons: 8, duration: "2h 30min", progress: 30, status: "in_progress" },
  { id: "5", title: "Criando SaaS com WebEdit", description: "Crie produtos SaaS usando o WebEdit", category: "SaaS", lessons: 20, duration: "10h", certification: "SaaS Builder", progress: 0, status: "not_started" },
  { id: "6", title: "Consultoria IA para Negócios", description: "Metodologia de consultoria em inteligência artificial", category: "Consultoria", lessons: 14, duration: "6h", certification: "AI Business Consultant", progress: 0, status: "not_started" },
];

const TrainingCenterTab = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed" | "not_started">("all");
  const [courses, setCourses] = useState(MOCK_COURSES);

  const filtered = courses.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleStart = (id: string) => {
    setCourses(courses.map((c) => c.id === id ? { ...c, status: "in_progress" as const, progress: 5 } : c));
    toast.success("Curso iniciado!");
  };

  const statusLabel = { not_started: "Não iniciado", in_progress: "Em andamento", completed: "Concluído" };
  const statusVariant = { not_started: "outline" as const, in_progress: "secondary" as const, completed: "default" as const };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total de cursos", value: courses.length, icon: BookOpen },
          { label: "Em andamento", value: courses.filter((c) => c.status === "in_progress").length, icon: Play },
          { label: "Concluídos", value: courses.filter((c) => c.status === "completed").length, icon: Award },
          { label: "Horas de conteúdo", value: "35h+", icon: Clock },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar curso..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {(["all", "in_progress", "completed", "not_started"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : statusLabel[f]}
            </Button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Badge variant="outline" className="text-xs">{course.category}</Badge>
                <Badge variant={statusVariant[course.status]} className="text-xs">{statusLabel[course.status]}</Badge>
              </div>
              <h3 className="font-semibold text-foreground text-sm">{course.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{course.lessons} aulas</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}</span>
              </div>
              {course.certification && (
                <div className="flex items-center gap-1 text-xs text-primary">
                  <Award className="w-3 h-3" /> Certificação: {course.certification}
                </div>
              )}
              {course.status !== "not_started" && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-foreground font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1.5" />
                </div>
              )}
              {course.status === "not_started" && (
                <Button size="sm" className="w-full" onClick={() => handleStart(course.id)}>
                  <Play className="w-3 h-3 mr-1" /> Iniciar curso
                </Button>
              )}
              {course.status === "in_progress" && (
                <Button size="sm" variant="secondary" className="w-full">
                  <Play className="w-3 h-3 mr-1" /> Continuar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TrainingCenterTab;
