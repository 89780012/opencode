import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  open: boolean;
  disabled?: boolean;
  name?: string;
  onClick: () => void;
}

export function ChatWorkspaceToggle(props: Props) {
  const text = props.disabled ? "Select a workspace first" : props.open ? "Hide workspace" : "Show workspace";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button variant="outline" size="sm" disabled={props.disabled} onClick={props.onClick}>
            {props.open ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            <span className="max-w-36 truncate">{props.name ?? "Workspace"}</span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="left" sideOffset={8}>
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
