import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Coleção categorizada — substitui o grid fixo de 20 emojis. Sem dependência
// externa (evita risco de build); cobre o que o atendente usa no dia a dia.
const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Sorrisos & emoções", icon: "😀",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤗","🤭","🤫","🤔","🤨","😐","😑","😶","😏","😒","🙄","😬","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬"],
  },
  {
    label: "Gestos & pessoas", icon: "👍",
    emojis: ["👍","👎","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","🙏","💪","🦾","✍️","👏","🙌","👐","🤲","🤜","🤛","✊","👊","🫶","🫰","🫵","🙋","🙅","🙆","💁","🙇","🤦","🤷","🧑‍💼","👨‍💻","👩‍💻","🧑‍🏫","🧑‍⚕️","👮","🕵️","👷","🤵","👰","🎅","🤶","👶","🧒","👨","👩","🧔","👴","👵"],
  },
  {
    label: "Corações & amor", icon: "❤️",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💌","💋","😻","🥰","😍","🫂"],
  },
  {
    label: "Símbolos & reações", icon: "✅",
    emojis: ["✅","☑️","✔️","❌","⭕","❗","❓","❕","❔","‼️","⁉️","💯","🔥","⭐","🌟","✨","⚡","💥","💫","💦","💨","🎉","🎊","🎈","🎁","🏆","🥇","🥈","🥉","🔔","🔕","➕","➖","🔴","🟠","🟡","🟢","🔵","🟣","⚪","⚫","🟤","🚫","♻️","⚠️","🆗","🆕","🔝","💤","👀"],
  },
  {
    label: "Trabalho & objetos", icon: "💼",
    emojis: ["💼","💰","💵","💳","🧾","💸","📱","💻","⌨️","🖥️","🖨️","📷","📸","🎥","📞","☎️","📠","📺","⏰","⏱️","⌛","⏳","🔋","🔌","💡","🔦","📔","📕","📗","📘","📙","📚","📝","✏️","🖊️","🖌️","📌","📎","✂️","📅","📆","🗓️","📁","📂","🗂️","🔒","🔑","🔨","🛠️","⚙️","🧰","📊","📈","📉","🎯","🔍","🔎"],
  },
  {
    label: "Comida & bebida", icon: "🍕",
    emojis: ["☕","🍵","🧉","🥤","🧃","🍺","🍻","🥂","🍷","🍽️","🍕","🍔","🍟","🌭","🥪","🌮","🌯","🥗","🍜","🍝","🍰","🎂","🧁","🍪","🍫","🍬","🍭","🍩","🍎","🍏","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🥑","🌽","🥕"],
  },
  {
    label: "Viagem & lugares", icon: "🚀",
    emojis: ["🚀","✈️","🚗","🚕","🚙","🚌","🏍️","🚲","🛵","🚚","🛻","🏠","🏢","🏬","🏭","🏗️","🌍","🌎","🌏","🗺️","📍","🧭","🏖️","⛱️","🏔️","⛰️","🌇","🌆","🌃","🌉","🎡","🎢","⛽","🚦","🗽","🏝️","🏕️","☀️","🌤️","⛅","🌧️","⛈️","🌈","❄️","🌙"],
  },
];

export default function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [cat, setCat] = useState(0);
  return (
    <div className="w-64">
      {/* Abas de categoria */}
      <div className="flex items-center gap-0.5 border-b border-border px-1.5 pb-1.5 pt-0.5">
        {CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            title={c.label}
            onClick={() => setCat(i)}
            className={cn(
              "w-7 h-7 rounded-md grid place-items-center text-base transition",
              cat === i ? "bg-accent" : "opacity-60 hover:opacity-100 hover:bg-accent/50",
            )}
          >
            {c.icon}
          </button>
        ))}
      </div>
      <ScrollArea className="h-52">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2.5 pt-2 pb-1">
          {CATEGORIES[cat].label}
        </p>
        <div className="grid grid-cols-8 gap-0.5 px-1.5 pb-2">
          {CATEGORIES[cat].emojis.map((e, idx) => (
            <button
              key={`${e}-${idx}`}
              onClick={() => onPick(e)}
              className="w-7 h-7 rounded grid place-items-center hover:bg-accent text-lg leading-none"
            >
              {e}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
