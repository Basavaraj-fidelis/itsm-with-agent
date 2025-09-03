
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Download, Clock, Package, AlertTriangle } from "lucide-react";
import type { Agent } from "@/types/agent-types";

interface UpdatesTabProps {
  agent: Agent;
  windowsUpdates?: any;
}

export function UpdatesTab({ agent, windowsUpdates }: UpdatesTabProps) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            System Patches & Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            try {
              const rawData = agent?.latest_report?.raw_data;
              if (!rawData) {
                return (
                  <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      No agent data available
                    </p>
                  </div>
                );
              }

              const parsedData = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
              const osName = (
                agent?.latest_report?.os_info?.name ||
                parsedData?.os_info?.name ||
                parsedData?.system_info?.os ||
                ""
              ).toLowerCase();

              const patches = parsedData?.patches || [];
              const legacyPatches = parsedData?.os_info?.patches || [];
              const patchSummary = parsedData?.os_info?.patch_summary || null;
              const lastUpdate = parsedData?.os_info?.last_update;

              // Windows patches
              if (osName.includes("windows")) {
                return (
                  <div className="space-y-4">
                    {lastUpdate && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                            Last Update
                          </span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          {typeof lastUpdate === "object" && lastUpdate.DateTime
                            ? lastUpdate.DateTime
                            : typeof lastUpdate === "string"
                              ? lastUpdate
                              : lastUpdate?.value
                                ? new Date(parseInt(lastUpdate.value.replace(/\/Date\((\d+)\)\//, "$1"))).toLocaleDateString()
                                : "Unknown"}
                        </div>
                      </div>
                    )}

                    {windowsUpdates ? (
                      <div className="space-y-4">
                        {/* Available Updates */}
                        {windowsUpdates.available_updates && windowsUpdates.available_updates.length > 0 ? (
                          <div>
                            <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                              <Download className="w-4 h-4 text-orange-600" />
                              Available Windows Updates ({windowsUpdates.available_updates.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {windowsUpdates.available_updates.slice(0, 10).map((update, index) => (
                                <div key={index} className="p-3 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="text-sm font-medium text-orange-800 dark:text-orange-200">
                                      {update.Title || update.title}
                                    </div>
                                    {update.Severity && (
                                      <Badge variant={update.Severity === "Critical" ? "destructive" : "secondary"}>
                                        {update.Severity}
                                      </Badge>
                                    )}
                                  </div>
                                  {update.KBArticleIDs && (
                                    <div className="text-xs text-orange-600 dark:text-orange-400">
                                      KB: {update.KBArticleIDs}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Installed Updates */}
                        {windowsUpdates.installed_updates && windowsUpdates.installed_updates.length > 0 ? (
                          <div>
                            <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                              <Shield className="w-4 h-4 text-green-600" />
                              Recently Installed Windows Updates ({windowsUpdates.installed_updates.length})
                            </h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {windowsUpdates.installed_updates.slice(0, 15).map((update, index) => (
                                <div key={index} className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                                    {update.Title || update.title}
                                  </span>
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    {update.Date || update.install_date || "Unknown date"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* Last Search Date */}
                        {windowsUpdates.last_search_date && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                Last Update Check
                              </span>
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              {windowsUpdates.last_search_date}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (patches && patches.length > 0) || (legacyPatches && legacyPatches.length > 0) ? (
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          Installed Windows Patches ({(patches.length || 0) + (legacyPatches.length || 0)})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {patches.slice(0, 15).map((patch, index) => (
                            <div key={`patch-${index}`} className="flex justify-between items-center py-3 px-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                              <span className="text-sm font-medium font-mono text-green-800 dark:text-green-200">
                                {patch.id || patch.HotFixID || `KB${patch.id}`}
                              </span>
                              <span className="text-xs text-green-600 dark:text-green-400">
                                {patch.installed_on?.DateTime || patch.installed_on || patch.InstalledOn || 
                                 (patch.installed_on?.value && new Date(parseInt(patch.installed_on.value.replace(/\/Date\((\d+)\)\//, "$1"))).toLocaleDateString()) || 
                                 "Unknown date"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          No Windows patch data found
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          The agent may need to run Windows Update scan
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              // Linux patches
              if (osName.includes("linux") || osName.includes("ubuntu") || osName.includes("debian") || osName.includes("centos") || osName.includes("rhel")) {
                return (
                  <div className="space-y-4">
                    {patchSummary && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm text-blue-800 dark:text-blue-200">
                            Package Summary ({patchSummary.system_type || "Linux"})
                          </span>
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Total Installed: {patchSummary.total_installed || 0} packages
                        </div>
                        {patchSummary.last_update_date && (
                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Last Update: {patchSummary.last_update_date}
                          </div>
                        )}
                      </div>
                    )}

                    {patchSummary && patchSummary.recent_patches && patchSummary.recent_patches.length > 0 ? (
                      <div>
                        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-green-600" />
                          Recent System Updates ({patchSummary.recent_patches.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {patchSummary.recent_patches.map((patch, index) => (
                            <div key={index} className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
                              <div className="flex justify-between items-start mb-2">
                                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                                  {patch.action || "System Update"}
                                </div>
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  {patch.date}
                                </div>
                              </div>
                              <div className="text-xs text-green-700 dark:text-green-300 break-all">
                                {patch.package || "System update"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          No Linux package update history found
                        </p>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    Patch information not available
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    OS: {osName || "Unknown"} | Patches: {patches.length} | Summary: {patchSummary ? "Yes" : "No"}
                  </p>
                </div>
              );
            } catch (error) {
              console.error("Error parsing patch data:", error);
              return (
                <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Error parsing patch data
                  </p>
                </div>
              );
            }
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
