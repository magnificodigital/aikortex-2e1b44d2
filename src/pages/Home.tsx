import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const [userName, setUserName] = useState("Usuário");
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) setUserName(data.full_name);
      });

    setOnboardingChecked(true);
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const detectHonorific = (fullName: string): "Sr" | "Sra" => {
    const first = (fullName || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (!first) return "Sr";
    const maleEndingInA = new Set([
      "luca", "costa", "iuda", "barnaba", "elias", "tobias", "matias",
      "joshua", "akira", "yoshua",
    ]);
    const femaleNotEndingInA = new Set([
      "beatriz", "ines", "inês", "isis", "íris", "iris", "carmen", "miriam",
      "raquel", "isabel", "soledad", "esther", "ester", "abigail", "rute",
      "ruth", "judite", "estér",
    ]);
    if (femaleNotEndingInA.has(first)) return "Sra";
    if (maleEndingInA.has(first)) return "Sr";
    return first.endsWith("a") ? "Sra" : "Sr";
  };

  if (!onboardingChecked) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
        <h1 className="text-3xl lg:text-5xl font-light text-foreground mb-3 text-center">
          {getGreeting()}, {detectHonorific(userName)}. <span className="italic">{userName}</span>
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mb-10 text-center max-w-lg">
          Crie Agentes inteligentes e Aplicações para Whatsapp e Web em minutos conversando com a inteligência artificial.
        </p>

        <Button
          size="lg"
          className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base shadow-lg shadow-primary/20 transition-all hover:scale-105"
        >
          Fale com um Consultor
        </Button>
      </div>
    </DashboardLayout>
  );
};

export default Home;
