import React from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

interface EnhancedAuthErrorAlertProps {
  error?: string;
  success?: string;
}

export function EnhancedAuthErrorAlert({ error, success }: EnhancedAuthErrorAlertProps) {
  if (!error && !success) return null;

  // Determine alert type
  const getAlertType = (): "success" | "error" | "warning" | "info" => {
    if (success) return "success";

    if (
      error?.toLowerCase().includes("invalid") ||
      error?.toLowerCase().includes("credentials") ||
      error?.toLowerCase().includes("authentication") ||
      error?.includes("already registered") ||
      error?.includes("sign in failed")
    ) return "error";

    if (error?.toLowerCase().includes("too many") || error?.toLowerCase().includes("rate limit")) return "warning";

    if (error?.toLowerCase().includes("database") || error?.includes("trigger function")) return "info";

    return "error";
  };

  const alertType = getAlertType();

  const getIcon = () => {
    switch (alertType) {
      case "success": return <CheckCircle className="h-5 w-5" />;
      case "error": return <XCircle className="h-5 w-5" />;
      case "warning": return <AlertTriangle className="h-5 w-5" />;
      case "info": return <Info className="h-5 w-5" />;
      default: return <XCircle className="h-5 w-5" />;
    }
  };

  const getAlertStyles = () => {
    switch (alertType) {
      case "success": return "bg-green-100 border border-green-500 text-green-800";
      case "error": return "bg-red-100 border border-red-500 text-red-800";
      case "warning": return "bg-yellow-100 border border-yellow-500 text-yellow-800";
      case "info": return "bg-blue-100 border border-blue-500 text-blue-800";
      default: return "bg-red-100 border border-red-500 text-red-800";
    }
  };

  return (
    <Alert className={`rounded-xl p-4 ${getAlertStyles()}`} role="alert" aria-live="polite">
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getIcon()}</div>
            <div className="flex-1">
              <p className="leading-relaxed font-medium">{error || success}</p>
            </div>
          </div>

          {/* Help sections */}
          {error && (
            <>
              {/* Database issues */}
              {(error.toLowerCase().includes("database error") || error.toLowerCase().includes("trigger function")) && (
                <div className="bg-blue-50 border border-blue-300 text-blue-700 rounded-lg p-3">
                  <p className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" /> Database Assistance
                  </p>
                  <p className="text-sm mt-1">
                    Check the Database Setup section and run the Database Authentication Checker for automatic fixes.
                  </p>
                </div>
              )}

              {/* Login help */}
              {(error.toLowerCase().includes("invalid") || error.toLowerCase().includes("credentials") || error.toLowerCase().includes("sign in failed")) && (
                <div className="bg-gray-50 border border-gray-300 text-gray-700 rounded-lg p-3">
                  <p className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" /> Login Assistance
                  </p>
                  <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                    <li>Double-check your email and password</li>
                    <li>Ensure Caps Lock is off</li>
                    <li>Verify you’re using the correct account</li>
                    <li>If new, please sign up first</li>
                  </ul>
                </div>
              )}

              {/* Already registered */}
              {error.toLowerCase().includes("already registered") && (
                <div className="bg-blue-50 border border-blue-300 text-blue-700 rounded-lg p-3">
                  <p className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" /> Account Exists
                  </p>
                  <p className="text-sm mt-1">
                    This email is already linked to an account. Use the Sign In tab to access it.
                  </p>
                </div>
              )}

              {/* Rate limits */}
              {error.toLowerCase().includes("too many") && (
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg p-3">
                  <p className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Rate Limit
                  </p>
                  <p className="text-sm mt-1">Please wait a few minutes before trying again.</p>
                </div>
              )}

              {/* Captcha issues */}
              {(error.toLowerCase().includes("captcha") || error.toLowerCase().includes("security verification failed")) && (
                <div className="bg-orange-50 border border-orange-300 text-orange-700 rounded-lg p-3">
                  <p className="font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Captcha Issue
                  </p>
                  <p className="text-sm mt-1">
                    Disable Captcha in Supabase Auth settings for development and try again.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
