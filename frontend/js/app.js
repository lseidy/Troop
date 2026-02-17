// Minimal frontend app glue for Troop
// This file is intentionally small: it sets a default API base and exposes simple helpers
(function(){
  // Allow overriding before script load by setting window.API_BASE
  window.API_BASE = window.API_BASE || 'http://localhost:3000';

  // Simple helper to show messages in the UI (non-blocking)
  window.troopApp = {
    info: function(msg){
      console.log('[troop-app] ' + msg);
    },
    error: function(msg){
      console.error('[troop-app] ' + msg);
      try{ alert(msg); }catch(e){}
    }
  };

  // Indicate readiness
  console.log('troop frontend app initialized. API_BASE=', window.API_BASE);
})();
