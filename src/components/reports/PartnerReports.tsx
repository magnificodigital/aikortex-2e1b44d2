import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { Award, ShoppingBag, TrendingUp, Users } from "lucide-react";

const COLORS = [
  "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(270, 70%, 55%)", "hsl(199, 89%, 48%)", "hsl(0, 72%, 51%)",
];

const tierDistribution = [
  { name: "Starter", value: 42, fill: "hsl(30, 60%, 50%)" },
  { name: "Explorer", value: 28, fill: "hsl(0, 0%, 65%)" },
  { name: "Hack", value: 18, fill: "hsl(45, 90%, 50%)" },
];

const marketplaceData = [
  { category: "Agentes IA", publicados: 24, vendas: 156 },
  { category: "Automações", publicados: 18, vendas: 89 },
  { category: "Templates", publicados: 32, vendas: 210 },
  { category: "CRM Setup", publicados: 12, vendas: 67 },
  { category: "SaaS", publicados: 8, vendas: 34 },
];

const certificationsTrend = [
  { month: "Set", emitidas: 12 },
  { month: "Out", emitidas: 18 },
  { month: "Nov", emitidas: 15 },
  { month: "Dez", emitidas: 22 },
  { month: "Jan", emitidas: 28 },
  { month: "Fev", emitidas: 35 },
  { month: "Mar", emitidas: 31 },
];

const revenueByTier = [
  { tier: "Starter", receita: 12000 },
  { tier: "Explorer", receita: 45000 },
  { tier: "Hack", receita: 120000 },
];

const engagementData = [
  { month: "Set", logins: 320, cursos: 45, suporte: 28 },
  { month: "Out", logins: 380, cursos: 52, suporte: 35 },
  { month: "Nov", logins: 410, cursos: 60, suporte: 30 },
  { month: "Dez", logins: 350, cursos: 48, suporte: 22 },
  { month: "Jan", logins: 450, cursos: 72, suporte: 38 },
  { month: "Fev", logins: 520, cursos: 85, suporte: 42 },
  { month: "Mar", logins: 580, cursos: 91, suporte: 36 },
];

const PartnerReports = () => {
  const totalPartners = tierDistribution.reduce((s, t) => s + t.value, 0);
  const totalCerts = certificationsTrend.reduce((s, c) => s + c.emitidas, 0);
  const totalProducts = marketplaceData.reduce((s, m) => s + m.publicados, 0);
  const totalMarketplaceRevenue = revenueByTier.reduce((s, r) => s + r.receita, 0);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Parceiros", value: totalPartners, icon: Users, accent: "bg-primary/10 text-primary" },
          { label: "Certificações Emitidas", value: totalCerts, icon: Award, accent: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
          { label: "Produtos no Marketplace", value: totalProducts, icon: ShoppingBag, accent: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
          { label: "Receita Marketplace", value: `R$ ${(totalMarketplaceRevenue / 1000).toFixed(0)}k`, icon: TrendingUp, accent: "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))]" },
        ].map(k => (
          <div key={k.label} className="glass-card rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{k.label}</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.accent}`}>
                <k.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-foreground">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Tier</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={tierDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {tierDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Tier */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Receita por Tier</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByTier}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="tier" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" tickFormatter={v => `${v / 1000}k`} />
                <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString()}`} />
                <Bar dataKey="receita" name="Receita" fill="hsl(270, 70%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Certifications Trend */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Certificações Emitidas por Mês</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={certificationsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <Tooltip />
                <Line type="monotone" dataKey="emitidas" name="Certificações" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketplace Products */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Marketplace por Categoria</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketplaceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 45%)" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="publicados" name="Publicados" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="vendas" name="Vendas" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ecosystem Engagement */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Engajamento do Ecossistema</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 86%)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 15%, 45%)" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="logins" name="Logins" stroke="hsl(217, 91%, 60%)" strokeWidth={2} />
                <Line type="monotone" dataKey="cursos" name="Cursos Acessados" stroke="hsl(142, 71%, 45%)" strokeWidth={2} />
                <Line type="monotone" dataKey="suporte" name="Tickets Suporte" stroke="hsl(38, 92%, 50%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerReports;
