import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  Bot as BotIcon, 
  Hash, 
  Send, 
  Trash2, 
  Eye, 
  EyeOff, 
  Server, 
  MessageSquare,
  Loader2,
  Users,
  RefreshCw,
  ChevronDown
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Bot, InsertBot, DiscordGuild, DiscordChannel, DiscordMessage } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [newBotToken, setNewBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [isAddBotOpen, setIsAddBotOpen] = useState(false);
  const [isCommandsOpen, setIsCommandsOpen] = useState(false);
  const [channelMessageCounts, setChannelMessageCounts] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const commands = [
    { id: "apka", label: "Apka", description: "Link do aplikacji" },
    { id: "panel", label: "Panel", description: "Link do panelu" },
    { id: "instrukcje", label: "Instrukcje", description: "Wyslij dane" },
    { id: "ios", label: "iOS", description: "Instrukcja na iOS" },
  ];

  // Fetch all bots
  const { data: bots = [], isLoading: botsLoading } = useQuery<Bot[]>({
    queryKey: ["/api/bots"],
  });

  // Compute selectedBot early so we can use it in subsequent queries
  const selectedBot = bots.find(b => b.id === selectedBotId);
  const isBotOnline = selectedBot?.status === "online";

  // Fetch guilds for selected bot
  const { data: guilds = [], isLoading: guildsLoading, refetch: refetchGuilds } = useQuery<DiscordGuild[]>({
    queryKey: ["/api/bots", selectedBotId, "guilds"],
    enabled: !!selectedBotId && isBotOnline,
  });

  // Fetch channels for selected guild
  const { data: channels = [], isLoading: channelsLoading } = useQuery<DiscordChannel[]>({
    queryKey: ["/api/bots", selectedBotId, "guilds", selectedGuildId, "channels"],
    enabled: !!selectedBotId && !!selectedGuildId && isBotOnline,
  });

  // Fetch messages for selected channel
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useQuery<DiscordMessage[]>({
    queryKey: ["/api/bots", selectedBotId, "channels", selectedChannelId, "messages"],
    enabled: !!selectedBotId && !!selectedChannelId && isBotOnline,
    refetchInterval: 2000,
  });

  // Compute derived state
  const selectedGuild = guilds.find(g => g.id === selectedGuildId);
  const textChannels = channels.filter(c => c.type === 0);

  // Add bot mutation
  const addBotMutation = useMutation({
    mutationFn: (bot: InsertBot) => apiRequest("POST", "/api/bots", bot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      setNewBotName("");
      setNewBotToken("");
      setIsAddBotOpen(false);
      toast({ title: "Bot dodany", description: "Bot zostal pomyslnie dodany." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nieznany blad";
      toast({ title: "Blad", description: message, variant: "destructive" });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: (botId: string) => apiRequest("DELETE", `/api/bots/${botId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      if (selectedBotId) setSelectedBotId(null);
      setSelectedGuildId(null);
      setSelectedChannelId(null);
      toast({ title: "Bot usuniety", description: "Bot zostal usuniety." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nieznany blad";
      toast({ title: "Blad", description: message, variant: "destructive" });
    },
  });

  // Connect bot mutation
  const connectBotMutation = useMutation({
    mutationFn: (botId: string) => apiRequest("POST", `/api/bots/${botId}/connect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({ title: "Polaczono", description: "Bot zostal polaczony z Discord." });
    },
    onError: (error: unknown) => {
      console.error("Connect error:", error);
      const message = error instanceof Error ? error.message : "Nieznany blad";
      toast({ title: "Blad polaczenia", description: message, variant: "destructive" });
    },
  });

  // Disconnect bot mutation
  const disconnectBotMutation = useMutation({
    mutationFn: (botId: string) => apiRequest("POST", `/api/bots/${botId}/disconnect`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      setSelectedGuildId(null);
      setSelectedChannelId(null);
      toast({ title: "Rozlaczono", description: "Bot zostal rozlaczony." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nieznany blad";
      toast({ title: "Blad", description: message, variant: "destructive" });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest("POST", `/api/bots/${selectedBotId}/channels/${selectedChannelId}/messages`, { content }),
    onSuccess: () => {
      setMessageContent("");
      setTimeout(() => refetchMessages(), 100);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Nieznany blad";
      toast({ title: "Blad wysylania", description: message, variant: "destructive" });
    },
  });

  // Scroll to bottom when new messages arrive and mark as read
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (selectedChannelId) {
      setChannelMessageCounts(prev => ({
        ...prev,
        [selectedChannelId]: 0
      }));
    }
  }, [selectedChannelId]);

  // Track unread messages per channel
  useEffect(() => {
    if (selectedChannelId && messages.length > 0) {
      setChannelMessageCounts(prev => ({
        ...prev,
        [selectedChannelId]: 0
      }));
    }
  }, [messages, selectedChannelId]);

  // Auto-select first bot
  useEffect(() => {
    if (bots.length > 0 && !selectedBotId) {
      setSelectedBotId(bots[0].id);
    }
  }, [bots, selectedBotId]);

  // Auto-select first guild when bot is online
  useEffect(() => {
    if (guilds.length > 0 && !selectedGuildId) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [guilds, selectedGuildId]);

  // Auto-select first channel when guild is selected
  useEffect(() => {
    if (textChannels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(textChannels[0].id);
    }
  }, [textChannels, selectedChannelId]);

  const handleAddBot = () => {
    if (!newBotName.trim() || !newBotToken.trim()) {
      toast({ title: "Blad", description: "Wypelnij wszystkie pola.", variant: "destructive" });
      return;
    }
    addBotMutation.mutate({ name: newBotName.trim(), token: newBotToken.trim() });
  };

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate(messageContent.trim());
  };

  const handleSendCommand = (commandId: string) => {
    let messageToSend = "";
    
    switch (commandId) {
      case "apka":
        messageToSend = "https://buy.stripe.com/9B600k7NwbhLdTXdJugEg02";
        break;
      case "panel":
        messageToSend = "https://buy.stripe.com/4gMeVe8RAbhL6rvbBmgEg01";
        break;
      case "instrukcje":
        messageToSend = "Wyslij zdjecie twarzy, imie i nazwisko, date urodzenia";
        break;
      case "ios":
        messageToSend = "Uruchom strone w safari\nNacisnij strzalke w gore na dolnym pasku po srodku\nNacisnij \"Dodaj do ekranu głownego\"";
        break;
    }
    
    if (messageToSend) {
      sendMessageMutation.mutate(messageToSend);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-status-online";
      case "connecting": return "bg-status-away";
      default: return "bg-status-offline";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  };

  const isTicketChannel = (channelName: string) => {
    return /^ticket-\d+$/.test(channelName);
  };

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left Sidebar - Bot List (Panel 1) */}
      <div className="w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Dialog open={isAddBotOpen} onOpenChange={setIsAddBotOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2" data-testid="button-add-bot">
                <Plus className="w-4 h-4" />
                Dodaj Bota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Dodaj nowego bota</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bot-name">Nazwa bota</label>
                  <Input
                    id="bot-name"
                    placeholder="Moj Bot"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    data-testid="input-bot-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="bot-token">Token bota</label>
                  <div className="relative">
                    <Input
                      id="bot-token"
                      type={showToken ? "text" : "password"}
                      placeholder="MTIzNDU2Nzg..."
                      value={newBotToken}
                      onChange={(e) => setNewBotToken(e.target.value)}
                      className="pr-10 font-mono text-sm"
                      data-testid="input-bot-token"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowToken(!showToken)}
                      data-testid="button-toggle-token"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Token mozesz znalezc w Discord Developer Portal
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Anuluj</Button>
                </DialogClose>
                <Button 
                  onClick={handleAddBot} 
                  disabled={addBotMutation.isPending}
                  data-testid="button-confirm-add-bot"
                >
                  {addBotMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Dodaj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {botsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-3 rounded-md">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : bots.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <BotIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Brak botow</p>
                <p className="text-xs mt-1">Kliknij "Dodaj Bota" aby rozpoczac</p>
              </div>
            ) : (
              bots.map((bot) => (
                <div
                  key={bot.id}
                  className={`group relative p-3 rounded-md cursor-pointer transition-colors hover-elevate ${
                    selectedBotId === bot.id ? "bg-sidebar-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedBotId(bot.id);
                    setSelectedGuildId(null);
                    setSelectedChannelId(null);
                  }}
                  data-testid={`bot-item-${bot.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BotIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sidebar ${getStatusColor(bot.status)}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{bot.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{bot.status === "online" ? "Online" : bot.status === "connecting" ? "Laczenie..." : "Offline"}</p>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-delete-bot-${bot.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Usunac bota?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Czy na pewno chcesz usunac bota "{bot.name}"? Ta akcja jest nieodwracalna.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Anuluj</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteBotMutation.mutate(bot.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Usun
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Three Panel Layout */}
      {selectedBot ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 px-4 border-b border-border flex items-center justify-between gap-4 bg-card flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(selectedBot.status)}`} />
                <span className="font-semibold truncate">{selectedBot.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              {selectedBot.status === "online" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectBotMutation.mutate(selectedBot.id)}
                  disabled={disconnectBotMutation.isPending}
                  data-testid="button-disconnect-bot"
                >
                  {disconnectBotMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Rozlacz
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectBotMutation.mutate(selectedBot.id)}
                  disabled={connectBotMutation.isPending || selectedBot.status === "connecting"}
                  data-testid="button-connect-bot"
                >
                  {(connectBotMutation.isPending || selectedBot.status === "connecting") && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Polacz
                </Button>
              )}
            </div>
          </div>

          {/* Content - Three Panels */}
          {selectedBot.status !== "online" ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <BotIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Bot jest offline</h3>
                <p className="text-muted-foreground mb-4">Polacz bota aby zobaczyc serwery i kanaly.</p>
                <Button
                  onClick={() => connectBotMutation.mutate(selectedBot.id)}
                  disabled={connectBotMutation.isPending || selectedBot.status === "connecting"}
                  data-testid="button-connect-bot-empty"
                >
                  {(connectBotMutation.isPending || selectedBot.status === "connecting") && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Polacz z Discord
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              {/* Panel 2 - Server List */}
              <div className="w-56 flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
                <div className="p-3 border-b border-border flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Serwery</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => refetchGuilds()}
                    disabled={guildsLoading}
                    data-testid="button-refresh-servers"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${guildsLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {guildsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-2 rounded-md">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                      ))
                    ) : guilds.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Server className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Brak serwerow</p>
                      </div>
                    ) : (
                      guilds.map((guild) => (
                        <div
                          key={guild.id}
                          className={`p-2 rounded-md cursor-pointer transition-colors hover-elevate ${
                            selectedGuildId === guild.id ? "bg-accent" : ""
                          }`}
                          onClick={() => {
                            setSelectedGuildId(guild.id);
                            setSelectedChannelId(null);
                          }}
                          data-testid={`guild-item-${guild.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              {guild.icon ? (
                                <AvatarImage 
                                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} 
                                  alt={guild.name} 
                                />
                              ) : null}
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {guild.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{guild.name}</p>
                              {guild.memberCount && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Users className="w-3 h-3" />
                                  <span>{guild.memberCount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Panel 3 - Channel List */}
              <div className="w-48 flex-shrink-0 border-r border-border bg-card/50 flex flex-col">
                <div className="p-3 border-b border-border">
                  <h3 className="font-semibold text-sm truncate">
                    {selectedGuild ? selectedGuild.name : "Kanaly"}
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-0.5">
                    {!selectedGuildId ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <Hash className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Wybierz serwer</p>
                      </div>
                    ) : channelsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))
                    ) : textChannels.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">Brak kanalow</p>
                    ) : (
                      textChannels.map((channel) => {
                        const isTicket = isTicketChannel(channel.name);
                        const unreadCount = channelMessageCounts[channel.id] ?? 0;
                        
                        return (
                          <Button
                            key={channel.id}
                            variant="ghost"
                            className={`w-full justify-between gap-2 h-8 px-2 ${
                              selectedChannelId === channel.id 
                                ? "bg-accent" 
                                : isTicket 
                                  ? "bg-primary/10 hover:bg-primary/20" 
                                  : ""
                            }`}
                            onClick={() => setSelectedChannelId(channel.id)}
                            data-testid={`channel-button-${channel.id}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className={`truncate text-sm ${isTicket ? "font-medium" : ""}`}>{channel.name}</span>
                            </div>
                            {isTicket && unreadCount > 0 && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 h-5 flex-shrink-0">
                                {unreadCount}
                              </Badge>
                            )}
                          </Button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Panel 4 - Messages */}
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedChannelId ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center p-8">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Wybierz kanal</h3>
                      <p className="text-muted-foreground">Wybierz kanal z listy po lewej stronie.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Channel header */}
                    <div className="h-12 px-4 border-b border-border flex items-center gap-2 bg-card/30 flex-shrink-0">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <span className="font-semibold">
                        {textChannels.find(c => c.id === selectedChannelId)?.name}
                      </span>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        {messagesLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex gap-3">
                              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-4 w-full" />
                              </div>
                            </div>
                          ))
                        ) : messages.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">Brak wiadomosci</p>
                          </div>
                        ) : (
                          messages.map((message) => (
                            <div key={message.id} className="flex gap-3 group" data-testid={`message-${message.id}`}>
                              <Avatar className="w-10 h-10 flex-shrink-0">
                                {message.author.avatar ? (
                                  <AvatarImage 
                                    src={`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png`}
                                    alt={message.author.username}
                                  />
                                ) : null}
                                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                  {message.author.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-semibold text-sm">{message.author.username}</span>
                                  {message.author.bot && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">BOT</Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
                                </div>
                                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                                {message.attachments && message.attachments.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {message.attachments.map((attachment) => (
                                      <a 
                                        key={attachment.id}
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-primary hover:underline block"
                                      >
                                        {attachment.filename}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Commands Panel - Collapsible */}
                    <Collapsible open={isCommandsOpen} onOpenChange={setIsCommandsOpen} className="flex-shrink-0 border-t border-border">
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-between h-8 px-4 text-xs font-semibold text-muted-foreground hover:bg-muted/50"
                          data-testid="button-toggle-commands"
                        >
                          <span>Komendy szybkie</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isCommandsOpen ? "rotate-180" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 py-3 space-y-2 border-t border-border bg-muted/20">
                        {commands.map((cmd) => (
                          <Button
                            key={cmd.id}
                            variant="outline"
                            className="w-full justify-start h-auto py-2 px-3 flex-col items-start gap-1"
                            onClick={() => handleSendCommand(cmd.id)}
                            disabled={sendMessageMutation.isPending || !isBotOnline}
                            data-testid={`button-command-${cmd.id}`}
                          >
                            <span className="font-medium text-sm">{cmd.label}</span>
                            <span className="text-xs text-muted-foreground">{cmd.description}</span>
                          </Button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Message input */}
                    <div className="p-4 border-t border-border bg-card/50 flex-shrink-0">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Napisz wiadomosc..."
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="min-h-[44px] max-h-32 resize-none"
                          rows={1}
                          data-testid="input-message"
                        />
                        <Button
                          size="icon"
                          onClick={handleSendMessage}
                          disabled={!messageContent.trim() || sendMessageMutation.isPending}
                          data-testid="button-send-message"
                        >
                          {sendMessageMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 text-right">
                        {messageContent.length}/2000
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <BotIcon className="w-20 h-20 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Discord Bot Manager</h2>
            <p className="text-muted-foreground mb-4">Dodaj bota aby rozpoczac zarzadzanie.</p>
            <Button onClick={() => setIsAddBotOpen(true)} className="gap-2" data-testid="button-add-bot-empty">
              <Plus className="w-4 h-4" />
              Dodaj pierwszego bota
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
