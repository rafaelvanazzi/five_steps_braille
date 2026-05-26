import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Home from "./pages/Home";
import { useRouteA11y } from "./hooks/useRouteA11y";
import About from "./pages/About";
import ForInstitutions from "./pages/ForInstitutions";
import ForMusiciansDV from "./pages/ForMusiciansDV";
import ForMusiciansNoDV from "./pages/ForMusiciansNoDV";
import Library from "./pages/Library";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import Activities from "./pages/Activities";
import Forum from "./pages/Forum";
import AboutRafael from "./pages/AboutRafael";
import ForumCategory from "./pages/ForumCategory";
import ForumTopic from "./pages/ForumTopic";
import BrailleEditor from "./pages/BrailleEditor";
import AdminBulkEmail from "./pages/AdminBulkEmail";

// Wrapper component for anonymous editor
function BrailleEditorDemo(_props: any) {
  return <BrailleEditor allowAnonymous={true} />;
}

function Router() {
  useRouteA11y();
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/sobre" component={About} />
      <Route path="/sobre-rafael" component={AboutRafael} />
      <Route path="/para-instituicoes" component={ForInstitutions} />
      <Route path="/para-musicos-dv" component={ForMusiciansDV} />
      <Route path="/para-musicos-sem-dv" component={ForMusiciansNoDV} />
      <Route path="/acervo" component={Library} />
      <Route path="/atividades" component={Activities} />
      <Route path="/forum/topico/:id" component={ForumTopic} />
      <Route path="/forum/:slug" component={ForumCategory} />
      <Route path="/forum" component={Forum} />
      <Route path="/contato" component={Contact} />
      <Route path="/editor-musicografia-braille" element={<BrailleEditor />} />
      {/* @ts-ignore */}
      <Route path="/editor-demo" component={BrailleEditorDemo} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/emails" component={AdminBulkEmail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster richColors position="top-right" />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
