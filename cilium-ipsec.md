Cilium manifests with IPSec encryption
```yaml
---
# Source: cilium/templates/cilium-secrets-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
---
# Source: cilium/templates/cilium-agent/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-envoy/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium-envoy"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-ca-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cilium-ca
  namespace: kube-system
data:
  ca.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRYWRpSzdZbmJ5bWVFaWFRVTVnR3k4REFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3T1RFNE1EVXhNakUzV2hjTk1qZ3dPVEUzTURVeApNakUzV2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRRFFTeXZFUnI5K0lHT1FkT1Q5Zm9KUEFkN0NLYW1EY1lJNkNvb09acG5FSEZRaGVVZnYKZ1dCd29MODBFc2dnQ0lBVWtMTkpLd0hVK0xFVXpHUHhqVTFzSGJRSzJ3VEpXbzA5d2xDcXZUbnQ3TE1ncnRiMAoraWY3cGs0aWVYSFFoNnFFbDFqQm42OEJubXBZajdWUmZTTndTdDdTeXpjTG0rVWltb1Y1aDFRbEoyMmpwWFR6CjR4bE9PMmdVSXhSTmJTZmNQcTdVVHlqTFgyZ3pzVzZ5QmF2V2EyVXdORXRhVVg5WG95ZTVYYklscjBlR3ZLTnMKNG9BTHpRVTRzMFgrOU9uekFmbXcwdXJ5U3VvbkZPSTFoQVdzbTU5cHlYZDM4eXJyWlR0cG9JMDF3MTVvdjRuVwpvQVQxWUxsRStRL0JQZ2o0V2huZXp5aEFYRElQK1Axc3ZvblhBZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVIMCtkcVhTNmJNaXdVckExZlE2N0R4NFpTOTR3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFLQW10TFF6YUlvZTZZM1BWZ0dFY2ZqTjNRRzNPUWlkSzI5YkFyaXdQSkxIS2c0a2tWN0hPUG1uCk5WNlJub1FwSnQxYUo2MUpQU2d6OGlGKzk4dUY0cVBSUU1VQTEyWHdJSWVSekdqTFQwRlNEWVYrNnRPQmdLU0gKN2N6MDZiMDlha2ZTbERwZG5lYXMvVmp3ZW5WVDBFSWVzZ1kzQ1ZPQlJ3eEk4d2NOSnR6NFdBZVd1aEZvbnMzOAozUnV2VXM3Tmh2RG5IM0taTkhLVzMvVXY1cEs1OGplbEFUQ0NuNmNQTzZoRXgrclNPaFV1bFJEOElKeXFIMzlJCjJjOElaUFNaZUNlSm0rT0lWVFBwdzh5TXcxa3d0cGVGU3BWRmxqMUoxVGtCekN0UGRRZ2NtUC9qN3FPcHlNVFQKeGFZcHJzUS8ycDgrREFUZCtmdlR5TWtEK1ZpOEVsUT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  ca.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcFFJQkFBS0NBUUVBMEVzcnhFYS9maUJqa0hUay9YNkNUd0hld2ltcGczR0NPZ3FLRG1hWnhCeFVJWGxICjc0RmdjS0MvTkJMSUlBaUFGSkN6U1NzQjFQaXhGTXhqOFkxTmJCMjBDdHNFeVZxTlBjSlFxcjA1N2V5eklLN1cKOVBvbis2Wk9Jbmx4MEllcWhKZFl3Wit2QVo1cVdJKzFVWDBqY0VyZTBzczNDNXZsSXBxRmVZZFVKU2R0bzZWMAo4K01aVGp0b0ZDTVVUVzBuM0Q2dTFFOG95MTlvTTdGdXNnV3IxbXRsTURSTFdsRi9WNk1udVYyeUphOUhocnlqCmJPS0FDODBGT0xORi92VHA4d0g1c05McThrcnFKeFRpTllRRnJKdWZhY2wzZC9NcTYyVTdhYUNOTmNOZWFMK0oKMXFBRTlXQzVSUGtQd1Q0SStGb1ozczhvUUZ3eUQvajliTDZKMXdJREFRQUJBb0lCQUJ5QVJLOVpQT2VkdC9IeQp4TWlZOEd5dUpWUnREZmhoNWo5WjVOVWVuZWl6TmFIVTdnNXNKZzJUT1VaL1VXbnNyOVhnak4rMHBrNEZiM21ZCmxBNWYxdG0xNE1aaGZMQ3Vsc2YrR0RxY3BOb1UrdGU4aE1aRm1vWDVGaFRxaURQUDlIbXJHZVo0bXFJK2ttK20KemxrbHBkMCtLV292aTBzbjNEMFZackVmM3Rnc1kwYlR2enZsNFF3eXd5R0E1aDNNNlE1TjJVRXNlRHVTa2lFZQo2YkRNOVllUFhYR2dXVXowYzExbTNPbjBleFZIL0xnNEdIbkJ3V3lDT1BoakY2WmU3cC9XVTV0em82ckljV3U5CkowWUdVb01IYnFRcVNxeS9kemVuK2kweWN1WnBiU21rbUVaZEZWL2ZsTk1YTkE3cVRKV2pTS0pXTHI2TDBCNVcKTG5jMm1kMENnWUVBNWptMkR0eE1CTXArOURHQ0xZNTRNR2V0NEhxNS9QQmY2OFkvbTl1Q2grTWJJbERNcXJ4eQpUemR4SWYwUlpGbG93dHRRdHV1dXJ0amwzNnNmS1hQTjV4WnU1QnVmWjZWditCcmNkbk01LzlaWmY0bklwbDJECkhSVVdaZ2tyUDNIbUF1Q2xQQzRuTTVxNm9JL0xGVmpLaSt0cUZ0OXE0T3hYUHdSVDNGSFlLUFVDZ1lFQTU1emsKVG13UEg4S1d4bG44SXNhVURVWVh6ai9YTi95cFFLRVYvZGExTkJDaWhWVGlRV05CcnAvRWora3AzRGJRRnJvbwpTZ2ZYR3BudFFhZXJVZEIycFFoUGpvUTVBVUVQM2ViNlgxMCtEM0tMR2ZhQUpMUWVqVVVVd2lGNmtXbVdpeE5aCnFyMFBDdG1kZjRDakZ4U2p2NExRWnQ0am1oUzZVa3BCWjNhbVdCc0NnWUVBclU1SVJFdUZWaDN4RDNXdFh3bmUKWStISVBERm1qSWVPVFhnQkxoeEIySFVYV2UrbEFlbTF5dmdiUzlDckpQVkJMVjNYRnJ1MzFac2xBQWhhL3VOVAozbDgrdnF3a2hPcytyRy9jQWJhZnRIenhCbGI4R25CT1lMZ2RFbFpZbmZ2cGY4VUgzWk9Jb3dvWTd3RVBpVlE3CnRMUlVPaitZdnhScVlOK3JHVERySFhrQ2dZRUF3ck1NNlMvRmR2bHBMY3l2Tzd5YThKMmZuVzNsU2RkSG9HREoKejkwUjduYWRhRi8yNHVqQmFqNDhTbzNDOXEvTk5ZM0FHSnVHbzRJS0JFc2lwV0FNbktiajJmWWt4WDBnRFhZQgp1dkR6SHFFM2RkZlYyUVRoT2ZoOGZzVU45L2MrNmlLV0dnVmNBODd6cXg5RCtqOExlQTVMaW0zcWw3Z2MrTmdiCkt4Sit1MGtDZ1lFQWtDWkljTkQxcnp1aGFmQmdTOTdpVlE5ZEdZOXFtekNnWlRvUndOWEFxMy9qbkxKTWxOd0QKOUNHWituZmFxLzNCdUFPYVBmeHpScG1RZTVsdTQ1emdCQnV0NFBsTnVHMDk4eXpPdDFkdndLNE9MQ0RZUUVhUApqR1lXamJ5dVhJNXA1TTdkMXYxWFg5cXVoTzNKRjNreXpad3QxOTl3WjNERUJZc29xS1IvOWlFPQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
---
# Source: cilium/templates/hubble/tls-helm/server-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: hubble-server-certs
  namespace: kube-system
type: kubernetes.io/tls
data:
  ca.crt:  LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURFekNDQWZ1Z0F3SUJBZ0lRYWRpSzdZbmJ5bWVFaWFRVTVnR3k4REFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3T1RFNE1EVXhNakUzV2hjTk1qZ3dPVEUzTURVeApNakUzV2pBVU1SSXdFQVlEVlFRREV3bERhV3hwZFcwZ1EwRXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCCkR3QXdnZ0VLQW9JQkFRRFFTeXZFUnI5K0lHT1FkT1Q5Zm9KUEFkN0NLYW1EY1lJNkNvb09acG5FSEZRaGVVZnYKZ1dCd29MODBFc2dnQ0lBVWtMTkpLd0hVK0xFVXpHUHhqVTFzSGJRSzJ3VEpXbzA5d2xDcXZUbnQ3TE1ncnRiMAoraWY3cGs0aWVYSFFoNnFFbDFqQm42OEJubXBZajdWUmZTTndTdDdTeXpjTG0rVWltb1Y1aDFRbEoyMmpwWFR6CjR4bE9PMmdVSXhSTmJTZmNQcTdVVHlqTFgyZ3pzVzZ5QmF2V2EyVXdORXRhVVg5WG95ZTVYYklscjBlR3ZLTnMKNG9BTHpRVTRzMFgrOU9uekFmbXcwdXJ5U3VvbkZPSTFoQVdzbTU5cHlYZDM4eXJyWlR0cG9JMDF3MTVvdjRuVwpvQVQxWUxsRStRL0JQZ2o0V2huZXp5aEFYRElQK1Axc3ZvblhBZ01CQUFHallUQmZNQTRHQTFVZER3RUIvd1FFCkF3SUNwREFkQmdOVkhTVUVGakFVQmdnckJnRUZCUWNEQVFZSUt3WUJCUVVIQXdJd0R3WURWUjBUQVFIL0JBVXcKQXdFQi96QWRCZ05WSFE0RUZnUVVIMCtkcVhTNmJNaXdVckExZlE2N0R4NFpTOTR3RFFZSktvWklodmNOQVFFTApCUUFEZ2dFQkFLQW10TFF6YUlvZTZZM1BWZ0dFY2ZqTjNRRzNPUWlkSzI5YkFyaXdQSkxIS2c0a2tWN0hPUG1uCk5WNlJub1FwSnQxYUo2MUpQU2d6OGlGKzk4dUY0cVBSUU1VQTEyWHdJSWVSekdqTFQwRlNEWVYrNnRPQmdLU0gKN2N6MDZiMDlha2ZTbERwZG5lYXMvVmp3ZW5WVDBFSWVzZ1kzQ1ZPQlJ3eEk4d2NOSnR6NFdBZVd1aEZvbnMzOAozUnV2VXM3Tmh2RG5IM0taTkhLVzMvVXY1cEs1OGplbEFUQ0NuNmNQTzZoRXgrclNPaFV1bFJEOElKeXFIMzlJCjJjOElaUFNaZUNlSm0rT0lWVFBwdzh5TXcxa3d0cGVGU3BWRmxqMUoxVGtCekN0UGRRZ2NtUC9qN3FPcHlNVFQKeGFZcHJzUS8ycDgrREFUZCtmdlR5TWtEK1ZpOEVsUT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=
  tls.crt: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURWakNDQWo2Z0F3SUJBZ0lRR1dGeGpOaTFmclpUL3pvaXZaU29iekFOQmdrcWhraUc5dzBCQVFzRkFEQVUKTVJJd0VBWURWUVFERXdsRGFXeHBkVzBnUTBFd0hoY05NalV3T1RFNE1EVXhNakUzV2hjTk1qWXdPVEU0TURVeApNakUzV2pBcU1TZ3dKZ1lEVlFRRERCOHFMbVJsWm1GMWJIUXVhSFZpWW14bExXZHljR011WTJsc2FYVnRMbWx2Ck1JSUJJakFOQmdrcWhraUc5dzBCQVFFRkFBT0NBUThBTUlJQkNnS0NBUUVBcEFxWDdqUkg4T0d4ZnFTWUpiMVkKMG9IWVVjVEFQTUlSZFhUUmJSMVhHU1JpdGVXeUpwdlJEd080Mys4c25HMmk0L0oxTUZOUTNYdmgvT3AvaHBrcwoweUU2ZXd5Q2V6THNVL0NFS3BiWE1SV05uTkpPZzBQR0gzckVTNXE3T0VzZUgxMlBkbnMzeDAxcFJIUWxZaFpDCmRhS0hZUkVRby92cFg3ZU90N0FpZkgvMnFlQmFVNVZ0VlVMZVMwWmJJZ3hrOHphR1RuaUVHVnRiWW1nMU92a1MKMjdzTEZJemZEYUVsV1Z2UWRsam9JN2h6dVpVVlk5ZUtCS0JQSlpwUnBTSTZuVy9WYVBpNDAwQS9Ib1d3Y3N0QQphT1FEczJTWXE3Q0p3YzY4U1pHNW5wdk5qanpNOE5EWHdQZytOc3VDQitoUU11Z1A0QkJjRWlMV0ttby9XT0hNCkhRSURBUUFCbzRHTk1JR0tNQTRHQTFVZER3RUIvd1FFQXdJRm9EQWRCZ05WSFNVRUZqQVVCZ2dyQmdFRkJRY0QKQVFZSUt3WUJCUVVIQXdJd0RBWURWUjBUQVFIL0JBSXdBREFmQmdOVkhTTUVHREFXZ0JRZlQ1MnBkTHBzeUxCUwpzRFY5RHJzUEhobEwzakFxQmdOVkhSRUVJekFoZ2g4cUxtUmxabUYxYkhRdWFIVmlZbXhsTFdkeWNHTXVZMmxzCmFYVnRMbWx2TUEwR0NTcUdTSWIzRFFFQkN3VUFBNElCQVFBZ0tQY0xpUHhEbzd0N2JBSlhvMHJqc1ZlY08wNloKZ1JITnltQldZK0FqdE14dkNTWXdOTTVvR1ZkejVpZW9rSkVxU0dVRDM2c0JvUFlLRGlhYS84bG5MTU5Dc0FELwpMZGEwa1ExcVBzV0Q0QkRHajhrY1J5OTExR0RiakRUUDhRdFRqbmlIYkVBYlVBOXhuTEZQcllwclFEb2pCVnhTCkkyYXhTZXp6NnFJM2RzcnJMUEVlLzIxazE1cUJoMU04RTIzRXBZR2s0eHRmMHFZcDlYMmdYMWRKUWdUZDkxazEKRGxpdWwzbDNaU2FCK3JMdUxFUlFwdm94WXB4Z21jdE5YTzI1N1p6cmVock9CQXhNWGlpcnBHdXlTalZMeG8vaQpWYk9VcjkrMVRXOUhvVHZxbGs4eVlxQSt6aDhHbXVIU0tUSEV0dUFOSHpqd0laQVg0TTYvTDZzTgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
  tls.key: LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBcEFxWDdqUkg4T0d4ZnFTWUpiMVkwb0hZVWNUQVBNSVJkWFRSYlIxWEdTUml0ZVd5CkpwdlJEd080Mys4c25HMmk0L0oxTUZOUTNYdmgvT3AvaHBrczB5RTZld3lDZXpMc1UvQ0VLcGJYTVJXTm5OSk8KZzBQR0gzckVTNXE3T0VzZUgxMlBkbnMzeDAxcFJIUWxZaFpDZGFLSFlSRVFvL3ZwWDdlT3Q3QWlmSC8ycWVCYQpVNVZ0VlVMZVMwWmJJZ3hrOHphR1RuaUVHVnRiWW1nMU92a1MyN3NMRkl6ZkRhRWxXVnZRZGxqb0k3aHp1WlVWClk5ZUtCS0JQSlpwUnBTSTZuVy9WYVBpNDAwQS9Ib1d3Y3N0QWFPUURzMlNZcTdDSndjNjhTWkc1bnB2Tmpqek0KOE5EWHdQZytOc3VDQitoUU11Z1A0QkJjRWlMV0ttby9XT0hNSFFJREFRQUJBb0lCQUNZNVRiTzB2UHExTEczTgpIcUxVbnlqV0ZyamU5c2h4bEMzaFhaZG1XZEJDK1RsWFg0NjlpaFpNa0x5bGQ2aXZwMkFrTkFoaHNac2FiY3RJClBSVDVCa2ZnRzBkbTM5U2pSZ3c5SkI3a2JScEQ0bTZqVnFZaG1iM21GbTFqamJLTlZtU0tvWTVESWZrdjRaS1EKMmRFa1RMSXFnQTh2TWNoMFA2b05GSlZhMW41WjEyek8zdFl3SVk4R256REQxaHI5U0ZnUjhSQVM2QjFFWlFkRQpqWTJWNUpGcklXeGt5a3VnQnhsRSszbXQwVVBxMnBHRm9hUnpBL3NqZzB2MHhHVzNibHE0dTh1VFk4RGZoOEZLCmVGSlFYeGJhMUF6anVma1BWNHI2SjIzYmJrTlVGY0k4Q3hNVEFmRkVMcWlDeGJXZlZab3FveTdqakV5R3AxMzcKbURrWWd1RUNnWUVBMDJScTdPK3p5c1JiUjZGaldtOXFpUzhraTh2U3dTT2Z5bWMzTkFyRjNmT1hxV3JWQmxlbAp1em1EZHJ6SFBUZExQZGFYT0J4Tkc4Yk12SFY3MDZJSkRuTithVG9Fc0djWGkyeWdQTzJTSUErRldlTXE0U3lWCjkzNjFJU094elpUKzc4dzVtNDR6MmFsTEVxVmpSL0cyb292enJnQnRYYlYvVDVHNkVic2lodWtDZ1lFQXhxZysKS2JzQTNzZHE0UVYzaUR4c21DS0RQOVFSM2orYUt2cXBlT203K3QyRDE5Sjc4QnN1QXlmNVpXNkROOXg3YzVyTgpxbXF1ODZVdkM3YjVkSCs1S2tBTms3Mmt4S1JjL3BUeEFnekRmTzZKRTh5QjlFMXBIY3h6YjdyQm9Mako1SEQyCmV4T3dHbDVSSjZyTURUaGJvbVV2cTRaZnUrejUwOTNzWDZDNEF4VUNnWUVBbjczZVh6V3o4NkgyS0diNG9UcFkKazFvZ2o5TnlhNmp6OHd1VVY2dGNZcURWRnAwNFpSYU9rckNmZTNha1NNb2ovWkxQcXdNWDhjbUVwVlZTUVZiTQo2VEsxYitiNzdDRzdWUXk4K2MyOUFxVTM2L2tTU2g1YkpTK0d5SWdrc0duTFRJSlRkZzA3ZVZ2STgwb3ZnQXBVCkxQajlKNXdEQ1RGQ0Iycmo1TW81Q1NFQ2dZQWFPcXFDZmdOZVpyd1EyOVR0Y3ZUdm5WYncvWUlpY3dsYTlWK2MKN0ZkNmh2YmFieHNZRjY2YWtoT1d0ZUd6WlhRVFRuUXJOUXpHZEovaWp4VWVzYUowRnFMMFI4elNmZFVkYy9MaQpUMmNjUHE1d284Ymd4N3ZDU0hWUllqb2dpMlYwdVFtQ05KWkMxUU1vRnAvOGV0MTJjcCs1cVBOSTc4QUluanVRCllMc0xCUUtCZ1FETE51MEUwbm1VL1FMMWE4aWUxaXc4Z1B5cGVJSFd4cWVPTkN1dVhjbVdDWnFlY2Rsa05PTi8KSVVQaUlJclVSZzk5V1RodysvbHdjRUc3TEFPb0IwOVRHVExrdVBLY1hzTXBxL0hhbjB0c1RnanU1K2pVdUpBdwp0VHJiaTR5WFRIN2RLV3k5WFQwckNIMld3dFUxK1ZSVldESjc2VVVSWkFnYUlocHI3STdHd3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQo=
---
# Source: cilium/templates/cilium-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:

  # Identity allocation mode selects how identities are shared between cilium
  # nodes by setting how they are stored. The options are "crd", "kvstore" or
  # "doublewrite-readkvstore" / "doublewrite-readcrd".
  # - "crd" stores identities in kubernetes as CRDs (custom resource definition).
  #   These can be queried with:
  #     kubectl get ciliumid
  # - "kvstore" stores identities in an etcd kvstore, that is
  #   configured below. Cilium versions before 1.6 supported only the kvstore
  #   backend. Upgrades from these older cilium versions should continue using
  #   the kvstore by commenting out the identity-allocation-mode below, or
  #   setting it to "kvstore".
  # - "doublewrite" modes store identities in both the kvstore and CRDs. This is useful
  #   for seamless migrations from the kvstore mode to the crd mode. Consult the
  #   documentation for more information on how to perform the migration.
  identity-allocation-mode: crd

  identity-heartbeat-timeout: "30m0s"
  identity-gc-interval: "15m0s"
  cilium-endpoint-gc-interval: "5m0s"
  nodes-gc-interval: "5m0s"

  # If you want to run cilium in debug mode change this value to true
  debug: "false"
  # The agent can be put into the following three policy enforcement modes
  # default, always and never.
  # https://docs.cilium.io/en/latest/security/policy/intro/#policy-enforcement-modes
  enable-policy: "default"
  # If you want metrics enabled in cilium-operator, set the port for
  # which the Cilium Operator will have their metrics exposed.
  # NOTE that this will open the port on the nodes where Cilium operator pod
  # is scheduled.
  operator-prometheus-serve-addr: ":9963"
  enable-metrics: "true"
  enable-envoy-config: "true"
  envoy-config-retry-interval: "15s"
  enable-ingress-controller: "true"
  enforce-ingress-https: "true"
  enable-ingress-proxy-protocol: "false"
  enable-ingress-secrets-sync: "true"
  ingress-secrets-namespace: "cilium-secrets"
  ingress-lb-annotation-prefixes: "lbipam.cilium.io nodeipam.cilium.io service.beta.kubernetes.io service.kubernetes.io cloud.google.com"
  ingress-default-lb-mode: shared
  ingress-shared-lb-service-name: cilium-ingress
  ingress-hostnetwork-enabled: "false"
  ingress-hostnetwork-shared-listener-port: "8080"
  ingress-hostnetwork-nodelabelselector: ""
  enable-gateway-api: "true"
  enable-gateway-api-secrets-sync: "true"
  enable-gateway-api-proxy-protocol: "false"
  enable-gateway-api-app-protocol: "false"
  enable-gateway-api-alpn: "false"
  gateway-api-xff-num-trusted-hops: "0"
  gateway-api-service-externaltrafficpolicy: "Cluster"
  gateway-api-secrets-namespace: "cilium-secrets"
  gateway-api-hostnetwork-enabled: "false"
  gateway-api-hostnetwork-nodelabelselector: ""
  enable-policy-secrets-sync: "true"
  policy-secrets-only-from-secrets-namespace: "true"
  policy-secrets-namespace: "cilium-secrets"
  loadbalancer-l7: "envoy"
  loadbalancer-l7-ports: ""
  loadbalancer-l7-algorithm: "round_robin"

  # Enable IPv4 addressing. If enabled, all endpoints are allocated an IPv4
  # address.
  enable-ipv4: "true"

  # Enable IPv6 addressing. If enabled, all endpoints are allocated an IPv6
  # address.
  enable-ipv6: "false"
  # Users who wish to specify their own custom CNI configuration file must set
  # custom-cni-conf to "true", otherwise Cilium may overwrite the configuration.
  custom-cni-conf: "false"
  enable-bpf-clock-probe: "false"
  # If you want cilium monitor to aggregate tracing for packets, set this level
  # to "low", "medium", or "maximum". The higher the level, the less packets
  # that will be seen in monitor output.
  monitor-aggregation: medium

  # The monitor aggregation interval governs the typical time between monitor
  # notification events for each allowed connection.
  #
  # Only effective when monitor aggregation is set to "medium" or higher.
  monitor-aggregation-interval: "5s"

  # The monitor aggregation flags determine which TCP flags which, upon the
  # first observation, cause monitor notifications to be generated.
  #
  # Only effective when monitor aggregation is set to "medium" or higher.
  monitor-aggregation-flags: all
  # Specifies the ratio (0.0-1.0] of total system memory to use for dynamic
  # sizing of the TCP CT, non-TCP CT, NAT and policy BPF maps.
  bpf-map-dynamic-size-ratio: "0.0025"
  # bpf-policy-map-max specifies the maximum number of entries in endpoint
  # policy map (per endpoint)
  bpf-policy-map-max: "16384"
  # bpf-lb-map-max specifies the maximum number of entries in bpf lb service,
  # backend and affinity maps.
  bpf-lb-map-max: "65536"
  bpf-lb-external-clusterip: "false"
  bpf-lb-source-range-all-types: "false"
  bpf-lb-algorithm-annotation: "false"
  bpf-lb-mode-annotation: "false"

  bpf-distributed-lru: "false"
  bpf-events-drop-enabled: "true"
  bpf-events-policy-verdict-enabled: "true"
  bpf-events-trace-enabled: "true"

  # Pre-allocation of map entries allows per-packet latency to be reduced, at
  # the expense of up-front memory allocation for the entries in the maps. The
  # default value below will minimize memory usage in the default installation;
  # users who are sensitive to latency may consider setting this to "true".
  #
  # This option was introduced in Cilium 1.4. Cilium 1.3 and earlier ignore
  # this option and behave as though it is set to "true".
  #
  # If this value is modified, then during the next Cilium startup the restore
  # of existing endpoints and tracking of ongoing connections may be disrupted.
  # As a result, reply packets may be dropped and the load-balancing decisions
  # for established connections may change.
  #
  # If this option is set to "false" during an upgrade from 1.3 or earlier to
  # 1.4 or later, then it may cause one-time disruptions during the upgrade.
  preallocate-bpf-maps: "false"

  # Name of the cluster. Only relevant when building a mesh of clusters.
  cluster-name: default
  # Unique ID of the cluster. Must be unique across all conneted clusters and
  # in the range of 1 and 255. Only relevant when building a mesh of clusters.
  cluster-id: "0"

  # Encapsulation mode for communication between nodes
  # Possible values:
  #   - disabled
  #   - vxlan (default)
  #   - geneve

  routing-mode: "tunnel"
  tunnel-protocol: "geneve"
  tunnel-source-port-range: "0-0"
  service-no-backend-response: "reject"


  # Enables L7 proxy for L7 policy enforcement and visibility
  enable-l7-proxy: "true"

  enable-ipv4-masquerade: "true"
  enable-ipv4-big-tcp: "false"
  enable-ipv6-big-tcp: "false"
  enable-ipv6-masquerade: "true"
  enable-tcx: "true"
  datapath-mode: "veth"
  enable-bpf-masquerade: "true"
  enable-masquerade-to-route-source: "false"
  enable-ip-masq-agent: "true"
  enable-ipsec: "true"
  ipsec-key-file: /etc/ipsec/keys
  enable-ipsec-key-watcher: "true"
  ipsec-key-rotation-duration: "5m"
  enable-ipsec-encrypted-overlay: "false"

  enable-xt-socket-fallback: "true"
  install-no-conntrack-iptables-rules: "false"
  iptables-random-fully: "false"

  auto-direct-node-routes: "false"
  direct-routing-skip-unreachable: "false"
  enable-local-redirect-policy: "false"
  enable-runtime-device-detection: "true"

  kube-proxy-replacement: "true"
  kube-proxy-replacement-healthz-bind-address: ""
  bpf-lb-sock: "false"
  enable-health-check-nodeport: "true"
  enable-health-check-loadbalancer-ip: "false"
  node-port-bind-protection: "true"
  enable-auto-protect-node-port-range: "true"
  bpf-lb-acceleration: "disabled"
  enable-experimental-lb: "false"
  enable-svc-source-range-check: "true"
  enable-l2-neigh-discovery: "true"
  arping-refresh-period: "30s"
  k8s-require-ipv4-pod-cidr: "false"
  k8s-require-ipv6-pod-cidr: "false"
  enable-k8s-networkpolicy: "true"
  enable-endpoint-lockdown-on-policy-overflow: "false"
  # Tell the agent to generate and write a CNI configuration file
  write-cni-conf-when-ready: /host/etc/cni/net.d/05-cilium.conflist
  cni-exclusive: "true"
  cni-log-file: "/var/run/cilium/cilium-cni.log"
  enable-endpoint-health-checking: "true"
  enable-health-checking: "true"
  health-check-icmp-failure-threshold: "3"
  enable-well-known-identities: "false"
  enable-node-selector-labels: "false"
  synchronize-k8s-nodes: "true"
  operator-api-serve-addr: "127.0.0.1:9234"

  enable-hubble: "true"
  # UNIX domain socket for Hubble server to listen to.
  hubble-socket-path: "/var/run/cilium/hubble.sock"
  hubble-export-file-max-size-mb: "10"
  hubble-export-file-max-backups: "5"
  # An additional address for Hubble server to listen to (e.g. ":4244").
  hubble-listen-address: ":4244"
  hubble-disable-tls: "false"
  hubble-tls-cert-file: /var/lib/cilium/tls/hubble/server.crt
  hubble-tls-key-file: /var/lib/cilium/tls/hubble/server.key
  hubble-tls-client-ca-files: /var/lib/cilium/tls/hubble/client-ca.crt
  ipam: "kubernetes"
  ipam-cilium-node-update-rate: "15s"

  default-lb-service-ipam: "lbipam"
  egress-gateway-reconciliation-trigger-interval: "1s"
  enable-vtep: "false"
  vtep-endpoint: ""
  vtep-cidr: ""
  vtep-mask: ""
  vtep-mac: ""
  # Enable L2 announcements
  enable-l2-announcements: "true"
  l2-announcements-lease-duration: "3s"
  l2-announcements-renew-deadline: "1s"
  l2-announcements-retry-period: "500ms"
  procfs: "/host/proc"
  bpf-root: "/sys/fs/bpf"
  cgroup-root: "/run/cilium/cgroupv2"
  enable-k8s-terminating-endpoint: "true"
  enable-sctp: "false"
  remove-cilium-node-taints: "true"
  set-cilium-node-taints: "true"
  set-cilium-is-up-condition: "true"
  unmanaged-pod-watcher-interval: "15"
  # default DNS proxy to transparent mode in non-chaining modes
  dnsproxy-enable-transparent-mode: "true"
  dnsproxy-socket-linger-timeout: "10"
  tofqdns-dns-reject-response-code: "refused"
  tofqdns-enable-dns-compression: "true"
  tofqdns-endpoint-max-ip-per-hostname: "1000"
  tofqdns-idle-connection-grace-period: "0s"
  tofqdns-max-deferred-connection-deletes: "10000"
  tofqdns-proxy-response-max-delay: "100ms"
  agent-not-ready-taint-key: "node.cilium.io/agent-not-ready"

  mesh-auth-enabled: "true"
  mesh-auth-queue-size: "1024"
  mesh-auth-rotated-identities-queue-size: "1024"
  mesh-auth-gc-interval: "5m0s"

  proxy-xff-num-trusted-hops-ingress: "0"
  proxy-xff-num-trusted-hops-egress: "0"
  proxy-connect-timeout: "2"
  proxy-initial-fetch-timeout: "30"
  proxy-max-requests-per-connection: "0"
  proxy-max-connection-duration-seconds: "0"
  proxy-idle-timeout-seconds: "60"
  proxy-max-concurrent-retries: "128"
  http-retry-count: "3"

  external-envoy-proxy: "true"
  envoy-base-id: "0"
  envoy-access-log-buffer-size: "4096"
  envoy-keep-cap-netbindservice: "true"
  max-connected-clusters: "255"
  clustermesh-enable-endpoint-sync: "false"
  clustermesh-enable-mcs-api: "false"

  nat-map-stats-entries: "32"
  nat-map-stats-interval: "30s"
  enable-internal-traffic-policy: "true"
  enable-lb-ipam: "true"
  enable-non-default-deny-policies: "true"
  enable-source-ip-verification: "true"

# Extra config allows adding arbitrary properties to the cilium config.
# By putting it at the end of the ConfigMap, it's also possible to override existing properties.
---
# Source: cilium/templates/cilium-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ip-masq-agent
  namespace: kube-system
data:
  config: |-
    {"nonMasqueradeCIDRs":[]}
---
# Source: cilium/templates/cilium-envoy/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-envoy-config
  namespace: kube-system
data:
  # Keep the key name as bootstrap-config.json to avoid breaking changes
  bootstrap-config.json: |
    {"admin":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/admin.sock"}}},"applicationLogConfig":{"logFormat":{"textFormat":"[%Y-%m-%d %T.%e][%t][%l][%n] [%g:%#] %v"}},"bootstrapExtensions":[{"name":"envoy.bootstrap.internal_listener","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.bootstrap.internal_listener.v3.InternalListener"}}],"dynamicResources":{"cdsConfig":{"apiConfigSource":{"apiType":"GRPC","grpcServices":[{"envoyGrpc":{"clusterName":"xds-grpc-cilium"}}],"setNodeOnFirstMessageOnly":true,"transportApiVersion":"V3"},"initialFetchTimeout":"30s","resourceApiVersion":"V3"},"ldsConfig":{"apiConfigSource":{"apiType":"GRPC","grpcServices":[{"envoyGrpc":{"clusterName":"xds-grpc-cilium"}}],"setNodeOnFirstMessageOnly":true,"transportApiVersion":"V3"},"initialFetchTimeout":"30s","resourceApiVersion":"V3"}},"node":{"cluster":"ingress-cluster","id":"host~127.0.0.1~no-id~localdomain"},"overloadManager":{"resourceMonitors":[{"name":"envoy.resource_monitors.global_downstream_max_connections","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.resource_monitors.downstream_connections.v3.DownstreamConnectionsConfig","max_active_downstream_connections":"50000"}}]},"staticResources":{"clusters":[{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"ingress-cluster","type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"egress-cluster-tls","transportSocket":{"name":"cilium.tls_wrapper","typedConfig":{"@type":"type.googleapis.com/cilium.UpstreamTlsWrapperContext"}},"type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"upstreamHttpProtocolOptions":{},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"egress-cluster","type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"useDownstreamProtocolConfig":{}}}},{"circuitBreakers":{"thresholds":[{"maxRetries":128}]},"cleanupInterval":"2.500s","connectTimeout":"2s","lbPolicy":"CLUSTER_PROVIDED","name":"ingress-cluster-tls","transportSocket":{"name":"cilium.tls_wrapper","typedConfig":{"@type":"type.googleapis.com/cilium.UpstreamTlsWrapperContext"}},"type":"ORIGINAL_DST","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","commonHttpProtocolOptions":{"idleTimeout":"60s","maxConnectionDuration":"0s","maxRequestsPerConnection":0},"upstreamHttpProtocolOptions":{},"useDownstreamProtocolConfig":{}}}},{"connectTimeout":"2s","loadAssignment":{"clusterName":"xds-grpc-cilium","endpoints":[{"lbEndpoints":[{"endpoint":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/xds.sock"}}}}]}]},"name":"xds-grpc-cilium","type":"STATIC","typedExtensionProtocolOptions":{"envoy.extensions.upstreams.http.v3.HttpProtocolOptions":{"@type":"type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions","explicitHttpConfig":{"http2ProtocolOptions":{}}}}},{"connectTimeout":"2s","loadAssignment":{"clusterName":"/envoy-admin","endpoints":[{"lbEndpoints":[{"endpoint":{"address":{"pipe":{"path":"/var/run/cilium/envoy/sockets/admin.sock"}}}}]}]},"name":"/envoy-admin","type":"STATIC"}],"listeners":[{"address":{"socketAddress":{"address":"0.0.0.0","portValue":9964}},"filterChains":[{"filters":[{"name":"envoy.filters.network.http_connection_manager","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager","httpFilters":[{"name":"envoy.filters.http.router","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.http.router.v3.Router"}}],"internalAddressConfig":{"cidrRanges":[{"addressPrefix":"10.0.0.0","prefixLen":8},{"addressPrefix":"172.16.0.0","prefixLen":12},{"addressPrefix":"192.168.0.0","prefixLen":16},{"addressPrefix":"127.0.0.1","prefixLen":32}]},"routeConfig":{"virtualHosts":[{"domains":["*"],"name":"prometheus_metrics_route","routes":[{"match":{"prefix":"/metrics"},"name":"prometheus_metrics_route","route":{"cluster":"/envoy-admin","prefixRewrite":"/stats/prometheus"}}]}]},"statPrefix":"envoy-prometheus-metrics-listener","streamIdleTimeout":"0s"}}]}],"name":"envoy-prometheus-metrics-listener"},{"address":{"socketAddress":{"address":"127.0.0.1","portValue":9878}},"filterChains":[{"filters":[{"name":"envoy.filters.network.http_connection_manager","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager","httpFilters":[{"name":"envoy.filters.http.router","typedConfig":{"@type":"type.googleapis.com/envoy.extensions.filters.http.router.v3.Router"}}],"internalAddressConfig":{"cidrRanges":[{"addressPrefix":"10.0.0.0","prefixLen":8},{"addressPrefix":"172.16.0.0","prefixLen":12},{"addressPrefix":"192.168.0.0","prefixLen":16},{"addressPrefix":"127.0.0.1","prefixLen":32}]},"routeConfig":{"virtual_hosts":[{"domains":["*"],"name":"health","routes":[{"match":{"prefix":"/healthz"},"name":"health","route":{"cluster":"/envoy-admin","prefixRewrite":"/ready"}}]}]},"statPrefix":"envoy-health-listener","streamIdleTimeout":"0s"}}]}],"name":"envoy-health-listener"}]}}
---
# Source: cilium/templates/cilium-agent/clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cilium
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - networking.k8s.io
  resources:
  - networkpolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  - namespaces
  - services
  - pods
  - endpoints
  - nodes
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
  - get
  - update
  - list
  - delete
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - list
  - watch
  # This is used when validating policies in preflight. This will need to stay
  # until we figure out how to avoid "get" inside the preflight, and then
  # should be removed ideally.
  - get
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools
  - ciliumbgppeeringpolicies
  - ciliumbgpnodeconfigs
  - ciliumbgpadvertisements
  - ciliumbgppeerconfigs
  - ciliumclusterwideenvoyconfigs
  - ciliumclusterwidenetworkpolicies
  - ciliumegressgatewaypolicies
  - ciliumendpoints
  - ciliumendpointslices
  - ciliumenvoyconfigs
  - ciliumidentities
  - ciliumlocalredirectpolicies
  - ciliumnetworkpolicies
  - ciliumnodes
  - ciliumnodeconfigs
  - ciliumcidrgroups
  - ciliuml2announcementpolicies
  - ciliumpodippools
  verbs:
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumidentities
  - ciliumendpoints
  - ciliumnodes
  verbs:
  - create
- apiGroups:
  - cilium.io
  # To synchronize garbage collection of such resources
  resources:
  - ciliumidentities
  verbs:
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints
  verbs:
  - delete
  - get
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes
  - ciliumnodes/status
  verbs:
  - get
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints/status
  - ciliumendpoints
  - ciliuml2announcementpolicies/status
  - ciliumbgpnodeconfigs/status
  verbs:
  - patch
---
# Source: cilium/templates/cilium-operator/clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cilium-operator
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - get
  - list
  - watch
  # to automatically delete [core|kube]dns pods so that are starting to being
  # managed by Cilium
  - delete
- apiGroups:
  - ""
  resources:
  - configmaps
  resourceNames:
  - cilium-config
  verbs:
   # allow patching of the configmap to set annotations
  - patch
- apiGroups:
  - ""
  resources:
  - nodes
  verbs:
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # To remove node taints
  - nodes
  # To set NetworkUnavailable false on startup
  - nodes/status
  verbs:
  - patch
- apiGroups:
  - discovery.k8s.io
  resources:
  - endpointslices
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # to perform LB IP allocation for BGP
  - services/status
  verbs:
  - update
  - patch
- apiGroups:
  - ""
  resources:
  # to check apiserver connectivity
  - namespaces
  - secrets
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - ""
  resources:
  # to perform the translation of a CNP that contains `ToGroup` to its endpoints
  - services
  - endpoints
  verbs:
  - get
  - list
  - watch
  - create
  - update
  - delete
  - patch
- apiGroups:
  - cilium.io
  resources:
  - ciliumnetworkpolicies
  - ciliumclusterwidenetworkpolicies
  verbs:
  # Create auto-generated CNPs and CCNPs from Policies that have 'toGroups'
  - create
  - update
  - deletecollection
  # To update the status of the CNPs and CCNPs
  - patch
  - get
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumnetworkpolicies/status
  - ciliumclusterwidenetworkpolicies/status
  verbs:
  # Update the auto-generated CNPs and CCNPs status.
  - patch
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpoints
  - ciliumidentities
  verbs:
  # To perform garbage collection of such resources
  - delete
  - list
  - watch
- apiGroups:
  - cilium.io
  resources:
  - ciliumidentities
  verbs:
  # To synchronize garbage collection of such resources
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes
  verbs:
  - create
  - update
  - get
  - list
  - watch
    # To perform CiliumNode garbage collector
  - delete
- apiGroups:
  - cilium.io
  resources:
  - ciliumnodes/status
  verbs:
  - update
- apiGroups:
  - cilium.io
  resources:
  - ciliumendpointslices
  - ciliumenvoyconfigs
  - ciliumbgppeerconfigs
  - ciliumbgpadvertisements
  - ciliumbgpnodeconfigs
  verbs:
  - create
  - update
  - get
  - list
  - watch
  - delete
  - patch
- apiGroups:
  - cilium.io
  resources:
  - ciliumbgpclusterconfigs/status
  - ciliumbgppeerconfigs/status
  verbs:
  - update
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - create
  - get
  - list
  - watch
- apiGroups:
  - apiextensions.k8s.io
  resources:
  - customresourcedefinitions
  verbs:
  - update
  resourceNames:
  - ciliumloadbalancerippools.cilium.io
  - ciliumbgppeeringpolicies.cilium.io
  - ciliumbgpclusterconfigs.cilium.io
  - ciliumbgppeerconfigs.cilium.io
  - ciliumbgpadvertisements.cilium.io
  - ciliumbgpnodeconfigs.cilium.io
  - ciliumbgpnodeconfigoverrides.cilium.io
  - ciliumclusterwideenvoyconfigs.cilium.io
  - ciliumclusterwidenetworkpolicies.cilium.io
  - ciliumegressgatewaypolicies.cilium.io
  - ciliumendpoints.cilium.io
  - ciliumendpointslices.cilium.io
  - ciliumenvoyconfigs.cilium.io
  - ciliumexternalworkloads.cilium.io
  - ciliumidentities.cilium.io
  - ciliumlocalredirectpolicies.cilium.io
  - ciliumnetworkpolicies.cilium.io
  - ciliumnodes.cilium.io
  - ciliumnodeconfigs.cilium.io
  - ciliumcidrgroups.cilium.io
  - ciliuml2announcementpolicies.cilium.io
  - ciliumpodippools.cilium.io
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools
  - ciliumpodippools
  - ciliumbgppeeringpolicies
  - ciliumbgpclusterconfigs
  - ciliumbgpnodeconfigoverrides
  - ciliumbgppeerconfigs
  verbs:
  - get
  - list
  - watch
- apiGroups:
    - cilium.io
  resources:
    - ciliumpodippools
  verbs:
    - create
- apiGroups:
  - cilium.io
  resources:
  - ciliumloadbalancerippools/status
  verbs:
  - patch
# For cilium-operator running in HA mode.
#
# Cilium operator running in HA mode requires the use of ResourceLock for Leader Election
# between multiple running instances.
# The preferred way of doing this is to use LeasesResourceLock as edits to Leases are less
# common and fewer objects in the cluster watch "all Leases".
- apiGroups:
  - coordination.k8s.io
  resources:
  - leases
  verbs:
  - create
  - get
  - update
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses
  - ingressclasses
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - networking.k8s.io
  resources:
  - ingresses/status # To update ingress status with load balancer IP.
  verbs:
  - update
- apiGroups:
  - gateway.networking.k8s.io
  resources:
  - gatewayclasses
  - gateways
  - tlsroutes
  - httproutes
  - grpcroutes
  - referencegrants
  - referencepolicies
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - gateway.networking.k8s.io
  resources:
  - gatewayclasses/status
  - gateways/status
  - httproutes/status
  - grpcroutes/status
  - tlsroutes/status
  verbs:
  - update
  - patch
- apiGroups:
  - multicluster.x-k8s.io
  resources:
  - serviceimports
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cilium
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cilium
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cilium-operator
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cilium-operator
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-config-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - configmaps
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-agent/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-tlsinterception-secrets
  namespace: "cilium-secrets"  
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - get
  - list
  - watch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-operator/role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-operator-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  verbs:
  - create
  - delete
  - update
  - patch
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-config-agent
  namespace: kube-system
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-config-agent
subjects:
  - kind: ServiceAccount
    name: "cilium"
    namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-ingress-secrets
subjects:
  - kind: ServiceAccount
    name: "cilium"
    namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-gateway-secrets
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-agent/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-tlsinterception-secrets
subjects:
- kind: ServiceAccount
  name: "cilium"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-ingress-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-ingress-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-gateway-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-gateway-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-operator/rolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-operator-tlsinterception-secrets
  namespace: "cilium-secrets"
  labels:
    app.kubernetes.io/part-of: cilium
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-operator-tlsinterception-secrets
subjects:
- kind: ServiceAccount
  name: "cilium-operator"
  namespace: kube-system
---
# Source: cilium/templates/cilium-envoy/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-envoy
  namespace: kube-system
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9964"
  labels:
    k8s-app: cilium-envoy
    app.kubernetes.io/name: cilium-envoy
    app.kubernetes.io/part-of: cilium
    io.cilium/app: proxy
spec:
  clusterIP: None
  type: ClusterIP
  selector:
    k8s-app: cilium-envoy
  ports:
  - name: envoy-metrics
    port: 9964
    protocol: TCP
    targetPort: envoy-metrics
---
# Source: cilium/templates/cilium-ingress-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cilium-ingress
  namespace: kube-system
  labels:
    cilium.io/ingress: "true"
    app.kubernetes.io/part-of: cilium
spec:
  ports:
  - name: http
    port: 80
    protocol: TCP
    nodePort: 
  - name: https
    port: 443
    protocol: TCP
    nodePort: 
  type: LoadBalancer
  externalTrafficPolicy: Cluster
---
# Source: cilium/templates/hubble/peer-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: hubble-peer
  namespace: kube-system
  labels:
    k8s-app: cilium
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: hubble-peer

spec:
  selector:
    k8s-app: cilium
  ports:
  - name: peer-service
    port: 443
    protocol: TCP
    targetPort: 4244
  internalTrafficPolicy: Local
---
# Source: cilium/templates/cilium-agent/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium
  namespace: kube-system
  labels:
    k8s-app: cilium
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-agent
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 2
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-configmap-checksum: "572b14e0bf8b0604ca132313498c8d99a7f4589801d4b4bdc62035ef82689306"
      labels:
        k8s-app: cilium
        app.kubernetes.io/name: cilium-agent
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        seccompProfile:
          type: Unconfined
      containers:
      - name: cilium-agent
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-agent
        args:
        - --config-dir=/tmp/cilium/config-map
        startupProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
          failureThreshold: 105
          periodSeconds: 2
          successThreshold: 1
          initialDelaySeconds: 5
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
            - name: "require-k8s-connectivity"
              value: "false"
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9879
            scheme: HTTP
            httpHeaders:
            - name: "brief"
              value: "true"
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 3
          timeoutSeconds: 5
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: CILIUM_CLUSTERMESH_CONFIG
          value: /var/lib/cilium/clustermesh/
        - name: GOMEMLIMIT
          valueFrom:
            resourceFieldRef:
              resource: limits.memory
              divisor: '1'
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        lifecycle:
          postStart:
            exec:
              command:
              - "bash"
              - "-c"
              - |
                    set -o errexit
                    set -o pipefail
                    set -o nounset
                    
                    # When running in AWS ENI mode, it's likely that 'aws-node' has
                    # had a chance to install SNAT iptables rules. These can result
                    # in dropped traffic, so we should attempt to remove them.
                    # We do it using a 'postStart' hook since this may need to run
                    # for nodes which might have already been init'ed but may still
                    # have dangling rules. This is safe because there are no
                    # dependencies on anything that is part of the startup script
                    # itself, and can be safely run multiple times per node (e.g. in
                    # case of a restart).
                    if [[ "$(iptables-save | grep -E -c 'AWS-SNAT-CHAIN|AWS-CONNMARK-CHAIN')" != "0" ]];
                    then
                        echo 'Deleting iptables rules created by the AWS CNI VPC plugin'
                        iptables-save | grep -E -v 'AWS-SNAT-CHAIN|AWS-CONNMARK-CHAIN' | iptables-restore
                    fi
                    echo 'Done!'
                    
          preStop:
            exec:
              command:
              - /cni-uninstall.sh
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - CHOWN
              - KILL
              - NET_ADMIN
              - NET_RAW
              - IPC_LOCK
              - SYS_MODULE
              - SYS_ADMIN
              - SYS_RESOURCE
              - DAC_OVERRIDE
              - FOWNER
              - SETGID
              - SETUID
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - name: envoy-sockets
          mountPath: /var/run/cilium/envoy/sockets
          readOnly: false
        # Unprivileged containers need to mount /proc/sys/net from the host
        # to have write access
        - mountPath: /host/proc/sys/net
          name: host-proc-sys-net
        # Unprivileged containers need to mount /proc/sys/kernel from the host
        # to have write access
        - mountPath: /host/proc/sys/kernel
          name: host-proc-sys-kernel
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          # Unprivileged containers can't set mount propagation to bidirectional
          # in this case we will mount the bpf fs from an init container that
          # is privileged and set the mount propagation from host to container
          # in Cilium.
          mountPropagation: HostToContainer
        - name: cilium-run
          mountPath: /var/run/cilium
        - name: cilium-netns
          mountPath: /var/run/cilium/netns
          mountPropagation: HostToContainer
        - name: etc-cni-netd
          mountPath: /host/etc/cni/net.d
        - name: clustermesh-secrets
          mountPath: /var/lib/cilium/clustermesh
          readOnly: true
        - name: ip-masq-agent
          mountPath: /etc/config
          readOnly: true
          # Needed to be able to load kernel modules
        - name: lib-modules
          mountPath: /lib/modules
          readOnly: true
        - name: xtables-lock
          mountPath: /run/xtables.lock
        - name: cilium-ipsec-secrets
          mountPath: /etc/ipsec
        - name: hubble-tls
          mountPath: /var/lib/cilium/tls/hubble
          readOnly: true
        - name: tmp
          mountPath: /tmp
        
      initContainers:
      - name: config
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-dbg
        - build-config
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        terminationMessagePolicy: FallbackToLogsOnError
      # Required to mount cgroup2 filesystem on the underlying Kubernetes node.
      # We use nsenter command with host's cgroup and mount namespaces enabled.
      - name: mount-cgroup
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        env:
        - name: CGROUP_ROOT
          value: /run/cilium/cgroupv2
        - name: BIN_PATH
          value: /opt/cni/bin
        command:
        - sh
        - -ec
        # The statically linked Go program binary is invoked to avoid any
        # dependency on utilities like sh and mount that can be missing on certain
        # distros installed on the underlying host. Copy the binary to the
        # same directory where we install cilium cni plugin so that exec permissions
        # are available.
        - |
          cp /usr/bin/cilium-mount /hostbin/cilium-mount;
          nsenter --cgroup=/hostproc/1/ns/cgroup --mount=/hostproc/1/ns/mnt "${BIN_PATH}/cilium-mount" $CGROUP_ROOT;
          rm /hostbin/cilium-mount
        volumeMounts:
        - name: hostproc
          mountPath: /hostproc
        - name: cni-path
          mountPath: /hostbin
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_CHROOT
              - SYS_PTRACE
            drop:
              - ALL
      - name: apply-sysctl-overwrites
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        env:
        - name: BIN_PATH
          value: /opt/cni/bin
        command:
        - sh
        - -ec
        # The statically linked Go program binary is invoked to avoid any
        # dependency on utilities like sh that can be missing on certain
        # distros installed on the underlying host. Copy the binary to the
        # same directory where we install cilium cni plugin so that exec permissions
        # are available.
        - |
          cp /usr/bin/cilium-sysctlfix /hostbin/cilium-sysctlfix;
          nsenter --mount=/hostproc/1/ns/mnt "${BIN_PATH}/cilium-sysctlfix";
          rm /hostbin/cilium-sysctlfix
        volumeMounts:
        - name: hostproc
          mountPath: /hostproc
        - name: cni-path
          mountPath: /hostbin
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - SYS_ADMIN
              - SYS_CHROOT
              - SYS_PTRACE
            drop:
              - ALL
      # Mount the bpf fs if it is not mounted. We will perform this task
      # from a privileged container because the mount propagation bidirectional
      # only works from privileged containers.
      - name: mount-bpf-fs
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        args:
        - 'mount | grep "/sys/fs/bpf type bpf" || mount -t bpf bpf /sys/fs/bpf'
        command:
        - /bin/bash
        - -c
        - --
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          privileged: true
        volumeMounts:
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          mountPropagation: Bidirectional
      - name: clean-cilium-state
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        command:
        - /init-container.sh
        env:
        - name: CILIUM_ALL_STATE
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: clean-cilium-state
              optional: true
        - name: CILIUM_BPF_STATE
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: clean-cilium-bpf-state
              optional: true
        - name: WRITE_CNI_CONF_WHEN_READY
          valueFrom:
            configMapKeyRef:
              name: cilium-config
              key: write-cni-conf-when-ready
              optional: true
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        terminationMessagePolicy: FallbackToLogsOnError
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - NET_ADMIN
              - SYS_MODULE
              - SYS_ADMIN
              - SYS_RESOURCE
            drop:
              - ALL
        volumeMounts:
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          # Required to mount cgroup filesystem from the host to cilium agent pod
        - name: cilium-cgroup
          mountPath: /run/cilium/cgroupv2
          mountPropagation: HostToContainer
        - name: cilium-run
          mountPath: /var/run/cilium # wait-for-kube-proxy
      # Install the CNI binaries in an InitContainer so we don't have a writable host mount in the agent
      - name: install-cni-binaries
        image: "quay.io/cilium/cilium:v1.17.7@sha256:b22440f49c61195171aca585c7a57c6a8867271e43a5abc38f2a2f561436ff86"
        imagePullPolicy: IfNotPresent
        command:
          - "/install-plugin.sh"
        resources:
          requests:
            cpu: 100m
            memory: 10Mi
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
          - name: cni-path
            mountPath: /host/opt/cni/bin # .Values.cni.install
      restartPolicy: Always
      priorityClassName: system-node-critical
      serviceAccountName: "cilium"
      automountServiceAccountToken: true
      terminationGracePeriodSeconds: 1
      hostNetwork: true
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
        # For sharing configuration between the "config" initContainer and the agent
      - name: tmp
        emptyDir: {}
        # To keep state between restarts / upgrades
      - name: cilium-run
        hostPath:
          path: /var/run/cilium
          type: DirectoryOrCreate
        # To exec into pod network namespaces
      - name: cilium-netns
        hostPath:
          path: /var/run/netns
          type: DirectoryOrCreate
        # To keep state between restarts / upgrades for bpf maps
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
      # To mount cgroup2 filesystem on the host or apply sysctlfix
      - name: hostproc
        hostPath:
          path: /proc
          type: Directory
      # To keep state between restarts / upgrades for cgroup2 filesystem
      - name: cilium-cgroup
        hostPath:
          path: /run/cilium/cgroupv2
          type: DirectoryOrCreate
      # To install cilium cni plugin in the host
      - name: cni-path
        hostPath:
          path:  /opt/cni/bin
          type: DirectoryOrCreate
        # To install cilium cni configuration in the host
      - name: etc-cni-netd
        hostPath:
          path: /etc/cni/net.d
          type: DirectoryOrCreate
        # To be able to load kernel modules
      - name: lib-modules
        hostPath:
          path: /lib/modules
        # To access iptables concurrently with other processes (e.g. kube-proxy)
      - name: xtables-lock
        hostPath:
          path: /run/xtables.lock
          type: FileOrCreate
      # Sharing socket with Cilium Envoy on the same node by using a host path
      - name: envoy-sockets
        hostPath:
          path: "/var/run/cilium/envoy/sockets"
          type: DirectoryOrCreate
        # To read the clustermesh configuration
      - name: clustermesh-secrets
        projected:
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          sources:
          - secret:
              name: cilium-clustermesh
              optional: true
              # note: items are not explicitly listed here, since the entries of this secret
              # depend on the peers configured, and that would cause a restart of all agents
              # at every addition/removal. Leaving the field empty makes each secret entry
              # to be automatically projected into the volume as a file whose name is the key.
          - secret:
              name: clustermesh-apiserver-remote-cert
              optional: true
              items:
              - key: tls.key
                path: common-etcd-client.key
              - key: tls.crt
                path: common-etcd-client.crt
              - key: ca.crt
                path: common-etcd-client-ca.crt
          # note: we configure the volume for the kvstoremesh-specific certificate
          # regardless of whether KVStoreMesh is enabled or not, so that it can be
          # automatically mounted in case KVStoreMesh gets subsequently enabled,
          # without requiring an agent restart.
          - secret:
              name: clustermesh-apiserver-local-cert
              optional: true
              items:
              - key: tls.key
                path: local-etcd-client.key
              - key: tls.crt
                path: local-etcd-client.crt
              - key: ca.crt
                path: local-etcd-client-ca.crt
      - name: ip-masq-agent
        configMap:
          name: ip-masq-agent
          optional: true
          items:
          - key: config
            path: ip-masq-agent
      - name: cilium-ipsec-secrets
        secret:
          secretName: cilium-ipsec-keys
      - name: host-proc-sys-net
        hostPath:
          path: /proc/sys/net
          type: Directory
      - name: host-proc-sys-kernel
        hostPath:
          path: /proc/sys/kernel
          type: Directory
      - name: hubble-tls
        projected:
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          sources:
          - secret:
              name: hubble-server-certs
              optional: true
              items:
              - key: tls.crt
                path: server.crt
              - key: tls.key
                path: server.key
              - key: ca.crt
                path: client-ca.crt
---
# Source: cilium/templates/cilium-envoy/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: cilium-envoy
  namespace: kube-system
  labels:
    k8s-app: cilium-envoy
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-envoy
    name: cilium-envoy
spec:
  selector:
    matchLabels:
      k8s-app: cilium-envoy
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 2
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-envoy-configmap-checksum: "93ea335eabe243968f498f059c70367529a6a0153e78e4458c312c6304bde14c"
      labels:
        k8s-app: cilium-envoy
        name: cilium-envoy
        app.kubernetes.io/name: cilium-envoy
        app.kubernetes.io/part-of: cilium
    spec:
      securityContext:
        seccompProfile:
          type: Unconfined
      containers:
      - name: cilium-envoy
        image: "quay.io/cilium/cilium-envoy:v1.33.6-1754542786-4d9638583910acb3e34d77e436cbd745d910a437@sha256:184240a145d656ab111cd2312deb6c46b94bc2c9d159c4811cf708b0848f8948"
        imagePullPolicy: IfNotPresent
        command:
        - /usr/bin/cilium-envoy-starter
        args:
        - '--keep-cap-net-bind-service'
        - '--'
        - '-c /var/run/cilium/envoy/bootstrap-config.json'
        - '--base-id 0'
        - '--log-level info'
        startupProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          failureThreshold: 105
          periodSeconds: 2
          successThreshold: 1
          initialDelaySeconds: 5
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 10
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9878
            scheme: HTTP
          periodSeconds: 30
          successThreshold: 1
          failureThreshold: 3
          timeoutSeconds: 5
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        ports:
        - name: envoy-metrics
          containerPort: 9964
          hostPort: 9964
          protocol: TCP
        securityContext:
          seLinuxOptions:
            level: s0
            type: spc_t
          capabilities:
            add:
              - NET_ADMIN
              - SYS_ADMIN
            drop:
              - ALL
        terminationMessagePolicy: FallbackToLogsOnError
        volumeMounts:
        - name: envoy-sockets
          mountPath: /var/run/cilium/envoy/sockets
          readOnly: false
        - name: envoy-artifacts
          mountPath: /var/run/cilium/envoy/artifacts
          readOnly: true
        - name: envoy-config
          mountPath: /var/run/cilium/envoy/
          readOnly: true
        - name: bpf-maps
          mountPath: /sys/fs/bpf
          mountPropagation: HostToContainer
      restartPolicy: Always
      priorityClassName: system-node-critical
      serviceAccountName: "cilium-envoy"
      automountServiceAccountToken: true
      terminationGracePeriodSeconds: 1
      hostNetwork: true
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: cilium.io/no-schedule
                operator: NotIn
                values:
                - "true"
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium
            topologyKey: kubernetes.io/hostname
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                k8s-app: cilium-envoy
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
      - name: envoy-sockets
        hostPath:
          path: "/var/run/cilium/envoy/sockets"
          type: DirectoryOrCreate
      - name: envoy-artifacts
        hostPath:
          path: "/var/run/cilium/envoy/artifacts"
          type: DirectoryOrCreate
      - name: envoy-config
        configMap:
          name: "cilium-envoy-config"
          # note: the leading zero means this number is in octal representation: do not remove it
          defaultMode: 0400
          items:
            - key: bootstrap-config.json
              path: bootstrap-config.json
        # To keep state between restarts / upgrades
        # To keep state between restarts / upgrades for bpf maps
      - name: bpf-maps
        hostPath:
          path: /sys/fs/bpf
          type: DirectoryOrCreate
---
# Source: cilium/templates/cilium-operator/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cilium-operator
  namespace: kube-system
  labels:
    io.cilium/app: operator
    name: cilium-operator
    app.kubernetes.io/part-of: cilium
    app.kubernetes.io/name: cilium-operator
spec:
  # See docs on ServerCapabilities.LeasesResourceLock in file pkg/k8s/version/version.go
  # for more details.
  replicas: 1
  selector:
    matchLabels:
      io.cilium/app: operator
      name: cilium-operator
  # ensure operator update on single node k8s clusters, by using rolling update with maxUnavailable=100% in case
  # of one replica and no user configured Recreate strategy.
  # otherwise an update might get stuck due to the default maxUnavailable=50% in combination with the
  # podAntiAffinity which prevents deployments of multiple operator replicas on the same node.
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 100%
    type: RollingUpdate
  template:
    metadata:
      annotations:
        # ensure pods roll when configmap updates
        cilium.io/cilium-configmap-checksum: "572b14e0bf8b0604ca132313498c8d99a7f4589801d4b4bdc62035ef82689306"
        prometheus.io/port: "9963"
        prometheus.io/scrape: "true"
      labels:
        io.cilium/app: operator
        name: cilium-operator
        app.kubernetes.io/part-of: cilium
        app.kubernetes.io/name: cilium-operator
    spec:
      containers:
      - name: cilium-operator
        image: "quay.io/cilium/operator-generic:v1.17.7@sha256:a610be2562d0f5a8945a27df7d5681711263ce92e09947e867fc37fc9ab08788"
        imagePullPolicy: IfNotPresent
        command:
        - cilium-operator-generic
        args:
        - --config-dir=/tmp/cilium/config-map
        - --debug=$(CILIUM_DEBUG)
        env:
        - name: K8S_NODE_NAME
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: spec.nodeName
        - name: CILIUM_K8S_NAMESPACE
          valueFrom:
            fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
        - name: CILIUM_DEBUG
          valueFrom:
            configMapKeyRef:
              key: debug
              name: cilium-config
              optional: true
        - name: KUBERNETES_SERVICE_HOST
          value: "127.0.0.1"
        - name: KUBERNETES_SERVICE_PORT
          value: "7443"
        ports:
        - name: prometheus
          containerPort: 9963
          hostPort: 9963
          protocol: TCP
        livenessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9234
            scheme: HTTP
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 3
        readinessProbe:
          httpGet:
            host: "127.0.0.1"
            path: /healthz
            port: 9234
            scheme: HTTP
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 5
        volumeMounts:
        - name: cilium-config-path
          mountPath: /tmp/cilium/config-map
          readOnly: true
        terminationMessagePolicy: FallbackToLogsOnError
      hostNetwork: true
      restartPolicy: Always
      priorityClassName: system-cluster-critical
      serviceAccountName: "cilium-operator"
      automountServiceAccountToken: true
      # In HA mode, cilium-operator pods must not be scheduled on the same
      # node as they will clash with each other.
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                io.cilium/app: operator
            topologyKey: kubernetes.io/hostname
      nodeSelector:
        kubernetes.io/os: linux
      tolerations:
        - operator: Exists
      volumes:
        # To read the configuration from the config map
      - name: cilium-config-path
        configMap:
          name: cilium-config
---
# Source: cilium/templates/cilium-ingress-class.yaml
apiVersion: networking.k8s.io/v1
kind: IngressClass
metadata:
  name: cilium
spec:
  controller: cilium.io/ingress-controller
---
# Source: cilium/templates/cilium-ingress-service.yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: cilium-ingress
  namespace: kube-system
subsets:
- addresses:
  - ip: "192.192.192.192"
  ports:
  - port: 9999
---
# Source: cilium/templates/cilium-gateway-api-class.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: cilium
spec:
  controllerName: io.cilium/gateway-controller
  description: The default Cilium GatewayClass
```