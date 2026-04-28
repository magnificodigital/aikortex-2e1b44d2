import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RightPanelState {
  isOpen: boolean;
  title: string;
  content: ReactNode | null;
}

interface RightPanelContextValue {
  openPanel: (title: string, content: ReactNode) => void;
  closePanel: () => void;
  isOpen: boolean;
}

const RightPanelContext = createContext<RightPanelContextValue | null>(null);

export const useRightPanel = () => {
  const ctx = useContext(RightPanelContext);
  if (!ctx) throw new Error("useRightPanel must be used within RightPanelProvider");
  return ctx;
};

export const RightPanelProvider = ({ children }: { children: ReactNode }) => {
  const [panel, setPanel] = useState<RightPanelState>({
    isOpen: false,
    title: "",
    content: null,
  });

  const openPanel = useCallback((title: string, content: ReactNode) => {
    setPanel({ isOpen: true, title, content });
  }, []);

  const closePanel = useCallback(() => {
    setPanel((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <RightPanelContext.Provider value={{ openPanel, closePanel, isOpen: panel.isOpen }}>
      {children}
      <Sheet open={panel.isOpen} onOpenChange={(open) => !open && closePanel()}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] md:w-[540px] lg:w-[600px] p-0 border-l border-border"
        >
          <SheetHeader className="px-6 py-4 border-b border-border">
            <SheetTitle className="text-lg font-semibold text-foreground">
              {panel.title}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-65px)]">
            <div className="p-6">
              {panel.content}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </RightPanelContext.Provider>
  );
};
