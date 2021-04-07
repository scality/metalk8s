package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"

	"github.com/prometheus/alertmanager/template"
)

func main() {
	address := flag.String("address", ":19094", "address and port of service")
	flag.Parse()

	log.SetFlags(log.Flags() &^ (log.Ldate | log.Ltime))

	http.HandleFunc("/", logAlert)
	http.HandleFunc("/ready", serverIsRunning)
	http.HandleFunc("/health", serverIsRunning)
	if err := http.ListenAndServe(*address, nil); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}

func serverIsRunning(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

func logAlert(w http.ResponseWriter, r *http.Request) {
	var alerts template.Data

	if err := json.NewDecoder(r.Body).Decode(&alerts); err != nil {
		log.Printf("Unable to parse HTTP body: %s", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	for _, alert := range alerts.Alerts {
		encoded_alert, err := json.Marshal(alert)
		if err != nil {
			log.Println(os.Stderr, "Invalid alert format: %v", err)
		} else {
			log.Println(string(encoded_alert))
		}
	}

	w.WriteHeader(http.StatusNoContent)
}
