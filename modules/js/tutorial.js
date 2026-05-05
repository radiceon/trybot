(function(d) {
    "use strict";

    var bot = d.bot;
    var t = function(s) { return (d.t || function(s) { return s; })(s); };
    var TUTORIAL_URL = "https://grepoplus.duckdns.org/tutorial/done";

    var ctx = d.logger.create("Tutorial");

    var STEPS = [
        {
            id: "welcome",
            title: function() { return "<img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImJnciIgY3g9IjQwJSIgY3k9IjM1JSIgcj0iNjUlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzIyMWMwYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwODA2MDIiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZThhMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjQwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM1YTNlMTAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcyIiB4MT0iMTAwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2YwZDg3OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3YTVlMjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3dSIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAuMTMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdUZXh0IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWU4YTAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0NSUiIHN0b3AtY29sb3I9IiNjOWE4NGMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNmE0ZTE4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGNsaXBQYXRoIGlkPSJjaXJjbGUtY2xpcCI+CiAgICAgIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjI4Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KCiAgPCEtLSBGb25kIGR1IGNlcmNsZSB1bmlxdWVtZW50IChwYXMgZGUgcmVjdCkgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjZ2xvd1IpIi8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjYmdyKSIvPgoKICA8IS0tIEFubmVhdXggLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMSkiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjM2IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjI1Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMikiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIxOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1kYXNoYXJyYXk9IjMgOCIgb3BhY2l0eT0iMC4zIi8+CgogIDwhLS0gRGlhbWFudHMgY2FyZGluYXV4IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjUwLDE4IDI1NSwyOCAyNTAsMzggMjQ1LDI4IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjI1MCw0NjIgMjU1LDQ1MiAyNTAsNDQyIDI0NSw0NTIiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjUwIDI4LDI0NSAzOCwyNTAgMjgsMjU1IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQ2MiwyNTAgNDUyLDI0NSA0NDIsMjUwIDQ1MiwyNTUiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgoKICA8IS0tIFRpY2tzIGNhcmRpbmF1eCAtLT4KICA8bGluZSB4MT0iMjUwIiB5MT0iMjAiIHgyPSIyNTAiIHkyPSIzOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIyNTAiIHkxPSI0NjIiIHgyPSIyNTAiIHkyPSI0ODAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMjAiIHkxPSIyNTAiIHgyPSIzOCIgeTI9IjI1MCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSI0NjIiIHkxPSIyNTAiIHgyPSI0ODAiIHkyPSIyNTAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSBUaWNrcyBkaWFnb25hdXggLS0+CiAgPGxpbmUgeDE9IjkyIiB5MT0iOTIiIHgyPSIxMDMiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiLz4KICA8bGluZSB4MT0iMzk3IiB5MT0iOTIiIHgyPSI0MDgiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKDkwLDQwMiw5NykiLz4KICA8bGluZSB4MT0iOTIiIHkxPSIzOTciIHgyPSIxMDMiIHkyPSI0MDgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKC05MCw5Nyw0MDIpIi8+CiAgPGxpbmUgeDE9IjM5NyIgeTE9IjM5NyIgeDI9IjQwOCIgeTI9IjQwOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC40NSIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwLDQwMiw0MDIpIi8+CgogIDwhLS0gUGV0aXRzIGNlcmNsZXMgZW50cmUgZGlhbWFudHMgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjQ1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjQ1MCIgY3k9IjI1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CgogIDwhLS0gRyBsZXR0cmUgLS0+CiAgPHRleHQKICAgIHg9IjI1MCIgeT0iMjUwIgogICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIgogICAgZm9udC1mYW1pbHk9IidDaW56ZWwnLCBHZW9yZ2lhLCBzZXJpZiIKICAgIGZvbnQtc2l6ZT0iMzQwIgogICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgIGZpbGw9InVybCgjZ1RleHQpIgogICAgY2xpcC1wYXRoPSJ1cmwoI2NpcmNsZS1jbGlwKSIKICA+RzwvdGV4dD4KCiAgPCEtLSBBcmNzIGTDqWNvcmF0aWZzIGhhdXQgKHBhciBkZXNzdXMgbGUgRykgLS0+CiAgPHBhdGggZD0iTSAxNDggMTMwIFEgMjUwIDg4IDM1MiAxMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNTUiLz4KICA8cGF0aCBkPSJNIDE1OCAxMTQgUSAyNTAgNjggMzQyIDExNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKICA8IS0tIEFyY3MgZMOpY29yYXRpZnMgYmFzIChwYXIgZGVzc3VzIGxlIEcpIC0tPgogIDxwYXRoIGQ9Ik0gMTQ4IDM3MCBRIDI1MCA0MTIgMzUyIDM3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC41NSIvPgogIDxwYXRoIGQ9Ik0gMTU4IDM4NiBRIDI1MCA0MzIgMzQyIDM4NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKPC9zdmc+Cg=='> " + t("Bienvenue sur GrepoPlus !"); },
            text: function() { return t("GrepoPlus est ton assistant bot pour Grepolis. Il automatise les tÃ¢ches rÃ©pÃ©titives pour que tu puisses te concentrer sur la stratÃ©gie.<br><br>Ce tutoriel te guidera Ã  travers les fonctionnalitÃ©s principales. Tu peux le quitter Ã  tout moment."); },
            target: null,
            position: "center",
            highlight: false
        },
        {
            id: "tab_modules",
            title: function() { return "<img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDUwMCA1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImJnciIgY3g9IjQwJSIgY3k9IjM1JSIgcj0iNjUlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzIyMWMwYSIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMwODA2MDIiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcxIiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZThhMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjQwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM1YTNlMTAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImcyIiB4MT0iMTAwJSIgeTE9IjAlIiB4Mj0iMCUiIHkyPSIxMDAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2YwZDg3OCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjUwJSIgc3RvcC1jb2xvcj0iI2M5YTg0YyIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiM3YTVlMjAiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3dSIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAuMTMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjYzlhODRjIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImdUZXh0IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjAlIiB5Mj0iMTAwJSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWU4YTAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0NSUiIHN0b3AtY29sb3I9IiNjOWE4NGMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjNmE0ZTE4Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGNsaXBQYXRoIGlkPSJjaXJjbGUtY2xpcCI+CiAgICAgIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjI4Ii8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KCiAgPCEtLSBGb25kIGR1IGNlcmNsZSB1bmlxdWVtZW50IChwYXMgZGUgcmVjdCkgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjZ2xvd1IpIi8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9InVybCgjYmdyKSIvPgoKICA8IS0tIEFubmVhdXggLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMSkiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjI1MCIgcj0iMjM2IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMC44IiBvcGFjaXR5PSIwLjI1Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIyMTIiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNnMikiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iMjUwIiByPSIxOTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIwLjgiIHN0cm9rZS1kYXNoYXJyYXk9IjMgOCIgb3BhY2l0eT0iMC4zIi8+CgogIDwhLS0gRGlhbWFudHMgY2FyZGluYXV4IC0tPgogIDxwb2x5Z29uIHBvaW50cz0iMjUwLDE4IDI1NSwyOCAyNTAsMzggMjQ1LDI4IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjI1MCw0NjIgMjU1LDQ1MiAyNTAsNDQyIDI0NSw0NTIiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgogIDxwb2x5Z29uIHBvaW50cz0iMTgsMjUwIDI4LDI0NSAzOCwyNTAgMjgsMjU1IiBmaWxsPSIjYzlhODRjIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjQ2MiwyNTAgNDUyLDI0NSA0NDIsMjUwIDQ1MiwyNTUiIGZpbGw9IiNjOWE4NGMiIG9wYWNpdHk9IjAuOSIvPgoKICA8IS0tIFRpY2tzIGNhcmRpbmF1eCAtLT4KICA8bGluZSB4MT0iMjUwIiB5MT0iMjAiIHgyPSIyNTAiIHkyPSIzOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSIyNTAiIHkxPSI0NjIiIHgyPSIyNTAiIHkyPSI0ODAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KICA8bGluZSB4MT0iMjAiIHkxPSIyNTAiIHgyPSIzOCIgeTI9IjI1MCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9IjAuNyIvPgogIDxsaW5lIHgxPSI0NjIiIHkxPSIyNTAiIHgyPSI0ODAiIHkyPSIyNTAiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSBUaWNrcyBkaWFnb25hdXggLS0+CiAgPGxpbmUgeDE9IjkyIiB5MT0iOTIiIHgyPSIxMDMiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiLz4KICA8bGluZSB4MT0iMzk3IiB5MT0iOTIiIHgyPSI0MDgiIHkyPSIxMDMiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKDkwLDQwMiw5NykiLz4KICA8bGluZSB4MT0iOTIiIHkxPSIzOTciIHgyPSIxMDMiIHkyPSI0MDgiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjIiIG9wYWNpdHk9IjAuNDUiIHRyYW5zZm9ybT0icm90YXRlKC05MCw5Nyw0MDIpIi8+CiAgPGxpbmUgeDE9IjM5NyIgeTE9IjM5NyIgeDI9IjQwOCIgeTI9IjQwOCIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuMiIgb3BhY2l0eT0iMC40NSIgdHJhbnNmb3JtPSJyb3RhdGUoMTgwLDQwMiw0MDIpIi8+CgogIDwhLS0gUGV0aXRzIGNlcmNsZXMgZW50cmUgZGlhbWFudHMgLS0+CiAgPGNpcmNsZSBjeD0iMjUwIiBjeT0iNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjI1MCIgY3k9IjQ1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CiAgPGNpcmNsZSBjeD0iNTAiIGN5PSIyNTAiIHI9IjMuNSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuNSIvPgogIDxjaXJjbGUgY3g9IjQ1MCIgY3k9IjI1MCIgcj0iMy41IiBmaWxsPSJub25lIiBzdHJva2U9IiNjOWE4NGMiIHN0cm9rZS13aWR0aD0iMSIgb3BhY2l0eT0iMC41Ii8+CgogIDwhLS0gRyBsZXR0cmUgLS0+CiAgPHRleHQKICAgIHg9IjI1MCIgeT0iMjUwIgogICAgdGV4dC1hbmNob3I9Im1pZGRsZSIKICAgIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIgogICAgZm9udC1mYW1pbHk9IidDaW56ZWwnLCBHZW9yZ2lhLCBzZXJpZiIKICAgIGZvbnQtc2l6ZT0iMzQwIgogICAgZm9udC13ZWlnaHQ9IjkwMCIKICAgIGZpbGw9InVybCgjZ1RleHQpIgogICAgY2xpcC1wYXRoPSJ1cmwoI2NpcmNsZS1jbGlwKSIKICA+RzwvdGV4dD4KCiAgPCEtLSBBcmNzIGTDqWNvcmF0aWZzIGhhdXQgKHBhciBkZXNzdXMgbGUgRykgLS0+CiAgPHBhdGggZD0iTSAxNDggMTMwIFEgMjUwIDg4IDM1MiAxMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2M5YTg0YyIgc3Ryb2tlLXdpZHRoPSIxLjUiIG9wYWNpdHk9IjAuNTUiLz4KICA8cGF0aCBkPSJNIDE1OCAxMTQgUSAyNTAgNjggMzQyIDExNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKICA8IS0tIEFyY3MgZMOpY29yYXRpZnMgYmFzIChwYXIgZGVzc3VzIGxlIEcpIC0tPgogIDxwYXRoIGQ9Ik0gMTQ4IDM3MCBRIDI1MCA0MTIgMzUyIDM3MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjEuNSIgb3BhY2l0eT0iMC41NSIvPgogIDxwYXRoIGQ9Ik0gMTU4IDM4NiBRIDI1MCA0MzIgMzQyIDM4NiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYzlhODRjIiBzdHJva2Utd2lkdGg9IjAuNyIgb3BhY2l0eT0iMC4yOCIvPgoKPC9zdmc+Cg=='> " + t("L'onglet SÃ©nat â€” Modules"); },
            text: function() { return t("L'onglet <strong>SÃ©nat</strong> est la page d'accueil du bot. Tu y vois tous les modules disponibles avec leur statut actif/inactif.<br><br>Les modules gratuits sont activables immÃ©diatement. Les modules ðŸ”’ nÃ©cessitent un abonnement premium."); },
            target: function() { return document.querySelector(".botSettings .bs-nav-item"); },
            position: "bottom",
            highlight: true,
            requireOpen: true
        },
        {
            id: "module_toggle",
            title: function() { return t("ðŸ”˜ Activer un module"); },
            text: function() { return t("Chaque module possÃ¨de un interrupteur <strong>ON/OFF</strong>. Glisse-le pour activer ou dÃ©sactiver le module.<br><br>Par exemple le <strong>Chercheur</strong> (gratuit) automatise la recherche de technologies."); },
            target: function() { var c = document.querySelectorAll(".bs-mod-card"); return c.length ? c[0] : null; },
            position: "bottom",
            highlight: true,
            requireOpen: true
        },
        {
            id: "tab_herald",
            title: function() { return t("âš”ï¸ HÃ©raut â€” Attaques entrantes"); },
            text: function() { return t("Le <strong>HÃ©raut</strong> surveille en temps rÃ©el les attaques ennemies sur tes citÃ©s. Il affiche les dÃ©tails de chaque attaque.<br><br>Clique sur l'icÃ´ne âš”ï¸ pour l'ouvrir directement."); },
            target: function() { return document.querySelector(".bs-btn-icon[title*='raut']") || document.querySelector(".bs-header-actions .bs-btn-icon"); },
            position: "bottom",
            highlight: true,
            requireOpen: true
        },
        {
            id: "tab_commander",
            title: function() { return t("ðŸš© Le Commandant â€” Ordres de combat"); },
            text: function() { return t("Le <strong>Commandant</strong> gÃ¨re tes ordres de combat : envoie des attaques, des soutiens, des colonisations en automatique Ã  l'heure exacte.<br><br>Clique sur l'icÃ´ne ðŸš© pour l'ouvrir."); },
            target: function() {
                var btns = document.querySelectorAll(".bs-btn-icon");
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].title && btns[i].title.indexOf("ommandant") !== -1) return btns[i];
                }
                return btns[1] || null;
            },
            position: "bottom",
            highlight: true,
            requireOpen: true
        },
        {
            id: "tab_farm",
            title: function() { return t("ðŸŒ¾ Collecteur (Premium)"); },
            text: function() { return t("Le <strong>Collecteur</strong> automatise la collecte de ressources dans les villages environnants. ParamÃ¨tre l'intervalle, les ressources Ã  collecter, et laisse le bot travailler.<br><br>Ce module est <strong>Premium</strong> â€” disponible dans la boutique."); },
            target: function() {
                var nav2 = document.querySelectorAll(".bs-nav2 .bs-nav2-item");
                for (var i = 0; i < nav2.length; i++) {
                    if (nav2[i].textContent.indexOf("Collecteur") !== -1) return nav2[i];
                }
                return null;
            },
            position: "right",
            highlight: true,
            requireOpen: true
        },
        {
            id: "tab_shop",
            title: function() { return t("ðŸ›’ La Boutique"); },
            text: function() { return t("Dans la <strong>Boutique</strong> tu peux dÃ©bloquer les modules Premium avec un abonnement mensuel.<br><br>Chaque module peut Ãªtre achetÃ© sÃ©parÃ©ment ou en <strong>pack complet</strong> Ã  prix rÃ©duit."); },
            target: function() {
                var nav2 = document.querySelectorAll(".bs-nav2-item");
                for (var i = 0; i < nav2.length; i++) {
                    if (nav2[i].textContent.indexOf("Shop") !== -1 || nav2[i].textContent.indexOf("Boutique") !== -1) return nav2[i];
                }
                return null;
            },
            position: "right",
            highlight: true,
            requireOpen: true
        },
        {
            id: "friends",
            title: function() { return t("ðŸ‘¥ Le systÃ¨me d'amis"); },
            text: function() { return t("Ajoute tes alliÃ©s comme amis GrepoPlus pour <strong>partager les attaques, ordres et troupes de tes citÃ©s en temps rÃ©el</strong> entre vous.<br><br>Clique sur ðŸ‘¥ pour gÃ©rer tes amis."); },
            target: function() {
                var btns = document.querySelectorAll(".bs-btn-icon");
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].title && btns[i].title.indexOf("mis") !== -1) return btns[i];
                }
                return btns[2] || null;
            },
            position: "bottom",
            highlight: true,
            requireOpen: true
        },
        {
            id: "finish",
            title: function() { return t("âœ… Tu es prÃªt !"); },
            text: function() { return t("Tu connais maintenant les bases de GrepoPlus. Bonne conquÃªte !<br><br>ðŸ’¡ <em>Pour retrouver ce tutoriel, va dans le SÃ©nat â†’ sous Mode dÃ©veloppeur â†’ <strong>Afficher le tutoriel</strong>.</em>"); },
            target: null,
            position: "center",
            highlight: false
        }
    ];

    function isTutorialDone() {
        try { if (bot.premiumData && bot.premiumData.tutorial_done === true) return true; } catch(e) {}
        return false;
    }

    function markTutorialDone() {
        if (bot.premiumData) bot.premiumData.tutorial_done = true;
        try {
            var pid = Game.player_id, pname = Game.player_name;
            try {
                var models = MM.getModels(), fk = Object.keys(models.Player)[0];
                pid = models.Player[fk].getId(); pname = models.Player[fk].getName();
            } catch(e2) {}
            // WS en prioritÃ©, fallback HTTP
            var _ws = null;
            try { _ws = (typeof ctx !== "undefined" && ctx._premiumWS) || null; } catch(e) {}
            if (!_ws) { try { _ws = window._grepoCtx && window._grepoCtx._premiumWS; } catch(e) {} }
            if (_ws && _ws.readyState === 1) {
                try { _ws.send(JSON.stringify({ type: "TUTORIAL_DONE", player_id: pid, player_name: pname })); return; } catch(e) {}
            }
            // Fallback HTTP
            $.ajax({ url: TUTORIAL_URL, method: "POST", contentType: "application/json",
                     data: JSON.stringify({ player_id: pid, player_name: pname }), timeout: 5000 });
        } catch(e) {}
    }

    function Tutorial() {
        var self        = this;
        self.step       = 0;
        self.active     = false;
        self._svgEl     = null;
        self._spotEl    = null;
        self._boxEl     = null;
        self._onKeyDown = null;

        self.start = function() {
            if (self.active) return;
            self.active = true;
            self.step   = 0;
            self._build();
            self._render();
            // Si la langue est dÃ©jÃ  chargÃ©e (langReady dÃ©jÃ  Ã©mis avant le build),
            // on force un re-render aprÃ¨s que le DOM soit stable.
            setTimeout(function() {
                if (self.active && self._boxEl) self._onLangReady();
            }, 200);
        };

        self.stop = function() {
            self.active = false;
            self._teardown();
        };

        self._build = function() {
            var ns = "http://www.w3.org/2000/svg";

            // â”€â”€ SVG overlay unique : fond sombre + trou evenodd â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // z-index 100500
            var svg = document.createElementNS(ns, "svg");
            svg.id  = "gp-tutorial-overlay";
            svg.setAttribute("xmlns", ns);
            svg.setAttribute("style",
                "position:fixed;top:0;left:0;width:100%;height:100%;" +
                "z-index:100500;pointer-events:none;overflow:visible;");
            // Le path avec fill-rule=evenodd sera mis Ã  jour dans _positionSpot
            // Par dÃ©faut (sans spotlight) : rect plein noir simple
            svg.innerHTML =
                "<defs>" +
                  "<clipPath id='_gptut_clip_' clipPathUnits='userSpaceOnUse'>" +
                    "<path id='_gptut_path_' fill-rule='evenodd' d=''/>" +
                  "</clipPath>" +
                "</defs>" +
                "<rect id='_gptut_bg_' x='0' y='0' width='100%' height='100%' fill='rgba(0,0,0,0.72)'/>";
            document.body.appendChild(svg);
            self._svgEl = svg;

            // â”€â”€ Div spot : outline dorÃ© animÃ©, fond transparent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // z-index 100501 (au-dessus du SVG)
            var spot = document.createElement("div");
            spot.id  = "gp-tutorial-spot";
            spot.style.cssText =
                "position:fixed;display:none;border-radius:8px;" +
                "z-index:100501;pointer-events:none;" +
                "outline:3px solid #c9a84c;outline-offset:2px;" +
                "box-shadow:0 0 20px 4px rgba(201,168,76,0.5),0 0 32px 8px rgba(201,168,76,0.3);" +
                "background:transparent;" +
                "animation:gp-tut-pulse 2s ease-in-out infinite;";
            document.body.appendChild(spot);
            self._spotEl = spot;

            // â”€â”€ BoÃ®te de dialogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            // z-index 100502
            var box = document.createElement("div");
            box.id  = "gp-tutorial-box";
            box.innerHTML =
                '<div class="gp-tut-header">' +
                    '<div class="gp-tut-step-badge"></div>' +
                    '<button class="gp-tut-close" title="' + t("Quitter le tutoriel") + '">\u2715</button>' +
                '</div>' +
                '<div class="gp-tut-title"></div>' +
                '<div class="gp-tut-text"></div>' +
                '<div class="gp-tut-progress"><div class="gp-tut-progress-bar"></div></div>' +
                '<div class="gp-tut-footer">' +
                    '<button class="gp-tut-btn-prev">' + t('â† PrÃ©cÃ©dent') + '</button>' +
                    '<button class="gp-tut-btn-next">' + t('Suivant â†’') + '</button>' +
                '</div>';
            document.body.appendChild(box);
            self._boxEl = box;

            box.querySelector(".gp-tut-close").addEventListener("click",    function() { self._skip(); });
            box.querySelector(".gp-tut-btn-prev").addEventListener("click", function() { self._prev(); });
            box.querySelector(".gp-tut-btn-next").addEventListener("click", function() { self._next(); });

            self._onKeyDown = function(e) {
                if (e.key === "Escape")     self._skip();
                if (e.key === "ArrowRight") self._next();
                if (e.key === "ArrowLeft")  self._prev();
            };
            document.addEventListener("keydown", self._onKeyDown);

            // Re-render quand la langue est chargÃ©e/changÃ©e
            self._onLangReady = function() {
                if (!self.active || !self._boxEl) return;
                var box = self._boxEl;
                box.querySelector(".gp-tut-close").title = t("Quitter le tutoriel");
                box.querySelector(".gp-tut-btn-prev").textContent = t("\u2190 Pr\u00e9c\u00e9dent");
                box.querySelector(".gp-tut-btn-next").textContent =
                    (self.step === STEPS.length - 1) ? t("Terminer \u2713") : t("Suivant \u2192");
                self._render();
            };
            document.addEventListener("grepoplus:langReady", self._onLangReady);
        };

        self._teardown = function() {
            ["_svgEl", "_spotEl", "_boxEl"].forEach(function(k) {
                if (self[k]) { try { document.body.removeChild(self[k]); } catch(e){} self[k] = null; }
            });
            if (self._onKeyDown) {
                document.removeEventListener("keydown", self._onKeyDown);
                self._onKeyDown = null;
            }
            if (self._onLangReady) {
                document.removeEventListener("grepoplus:langReady", self._onLangReady);
                self._onLangReady = null;
            }
        };

        self._render = function() {
            var step  = STEPS[self.step];
            if (!step) return;
            var box   = self._boxEl;
            var total = STEPS.length;

            box.querySelector(".gp-tut-step-badge").textContent = (self.step + 1) + " / " + total;

            // â”€â”€ Titre : image positionnÃ©e en absolute, texte vraiment centrÃ© â”€â”€
            var titleEl = box.querySelector(".gp-tut-title");
            var raw = (typeof step.title === 'function') ? step.title() : step.title;
            var imgMatch = raw.match(/^(<img[^>]*>)\s*([\s\S]*)$/);
            if (imgMatch) {
                // Image Ã  gauche en absolute, texte centrÃ© sur toute la largeur
                titleEl.innerHTML =
                    "<span class='gp-tut-title-img'>" + imgMatch[1] + "</span>" +
                    "<span class='gp-tut-title-txt'>" + imgMatch[2] + "</span>";
            } else {
                // Titre simple (emoji, texte) : enveloppÃ© pour centrage flex
                titleEl.innerHTML = "<span class='gp-tut-title-txt'>" + raw + "</span>";
            }

            box.querySelector(".gp-tut-text").innerHTML = (typeof step.text === 'function') ? step.text() : step.text;

            var pct = ((self.step + 1) / total * 100).toFixed(1);
            box.querySelector(".gp-tut-progress-bar").style.width = pct + "%";

            var btnPrev = box.querySelector(".gp-tut-btn-prev");
            var btnNext = box.querySelector(".gp-tut-btn-next");
            btnPrev.style.visibility = (self.step === 0) ? "hidden" : "visible";
            var isLast = (self.step === STEPS.length - 1);
            btnNext.textContent = isLast ? t("Terminer âœ“") : t("Suivant â†’");
            btnNext.className   = isLast ? "gp-tut-btn-next gp-tut-btn-finish" : "gp-tut-btn-next";

            if (step.requireOpen && !bot.settingsDlg) bot.settings();

            self._positionSpot(step);
            self._positionBox(step);
        };

        self._getTarget = function(step) {
            if (!step.target) return null;
            try {
                var el = (typeof step.target === "function") ? step.target() : step.target;
                if (el && el.getBoundingClientRect) return el;
            } catch(e) {}
            return null;
        };

        self._positionSpot = function(step) {
            var spot   = self._spotEl;
            var pathEl = document.getElementById("_gptut_path_");
            var bgEl   = document.getElementById("_gptut_bg_");
            var vw = window.innerWidth;
            var vh = window.innerHeight;

            if (!step.highlight) {
                // Pas de spotlight : fond noir plein, sans clip-path, spot cachÃ©
                if (bgEl)   { bgEl.removeAttribute("clip-path"); }
                if (pathEl) { pathEl.setAttribute("d", ""); }
                spot.style.display = "none";
                return;
            }

            var target = self._getTarget(step);
            if (!target) {
                if (bgEl)   { bgEl.removeAttribute("clip-path"); }
                if (pathEl) { pathEl.setAttribute("d", ""); }
                spot.style.display = "none";
                return;
            }

            var rect = target.getBoundingClientRect();
            var p    = 8; // padding
            var x1   = Math.round(rect.left   - p);
            var y1   = Math.round(rect.top    - p);
            var x2   = Math.round(rect.right  + p);
            var y2   = Math.round(rect.bottom + p);

            // Path evenodd = fond plein MOINS le trou
            // Rectangle extÃ©rieur (sens horaire) + rectangle intÃ©rieur (sens anti-horaire)
            var d =
                "M0,0 L"  + vw + ",0 L" + vw + "," + vh + " L0," + vh + " Z " +
                "M" + x1 + "," + y1 +
                " L" + x1 + "," + y2 +
                " L" + x2 + "," + y2 +
                " L" + x2 + "," + y1 + " Z";

            if (pathEl) pathEl.setAttribute("d", d);
            if (bgEl)   bgEl.setAttribute("clip-path", "url(#_gptut_clip_)");

            // Spot div : juste le glow dorÃ©, fond transparent (le trou du SVG est dÃ©jÃ  lÃ )
            spot.style.display = "block";
            spot.style.left    = x1 + "px";
            spot.style.top     = y1 + "px";
            spot.style.width   = (x2 - x1) + "px";
            spot.style.height  = (y2 - y1) + "px";

            try { target.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch(e) {}
        };

        self._positionBox = function(step) {
            var box    = self._boxEl;
            var target = self._getTarget(step);

            box.style.transition = "none";
            box.style.opacity    = "0";

            setTimeout(function() {
                box.style.transition = "";
                var bw = box.offsetWidth  || 380;
                var bh = box.offsetHeight || 220;
                var vw = window.innerWidth;
                var vh = window.innerHeight;
                var mg = 16;
                var left, top;

                if (!target || step.position === "center") {
                    left = Math.round((vw - bw) / 2);
                    top  = Math.round((vh - bh) / 2);
                } else {
                    var r   = target.getBoundingClientRect();
                    var pos = step.position || "bottom";
                    if      (pos === "bottom") { left = Math.round(r.left + r.width/2 - bw/2);  top = Math.round(r.bottom + mg + window.scrollY); }
                    else if (pos === "top")    { left = Math.round(r.left + r.width/2 - bw/2);  top = Math.round(r.top - bh - mg + window.scrollY); }
                    else if (pos === "right")  { left = Math.round(r.right + mg);                top = Math.round(r.top + r.height/2 - bh/2 + window.scrollY); }
                    else if (pos === "left")   { left = Math.round(r.left - bw - mg);            top = Math.round(r.top + r.height/2 - bh/2 + window.scrollY); }
                }

                left = Math.max(mg, Math.min(left, vw - bw - mg));
                top  = Math.max(mg, Math.min(top,  vh - bh - mg));

                box.style.left    = left + "px";
                box.style.top     = top  + "px";
                box.style.opacity = "1";
            }, 50);
        };

        self._next = function() {
            if (!self.active) return;
            if (self.step >= STEPS.length - 1) {
                markTutorialDone();
                self.stop();
                ctx("info", t("âœ… Tutoriel terminÃ© ! Retrouve-le dans SÃ©nat â†’ Afficher le tutoriel.")).msg(8);
                return;
            }
            self.step++;
            self._render();
        };

        self._prev = function() {
            if (!self.active || self.step === 0) return;
            self.step--;
            self._render();
        };

        self._skip = function() {
            markTutorialDone();
            self.stop();
        };
    }

    var tutorial = new Tutorial();
    bot.tutorial = tutorial;

    var _tutorialCancelled = false;
    var _langReady = false;
    var _pendingStart = false;

    // DÃ©marre le tutoriel seulement si la langue est dÃ©jÃ  prÃªte,
    // sinon enregistre une demande en attente.
    function _startWhenReady() {
        if (_tutorialCancelled || tutorial.active) return;
        if (_langReady) {
            tutorial.start();
        } else {
            _pendingStart = true;
        }
    }

    // DÃ¨s que la langue est chargÃ©e on marque le flag et on dÃ©marre
    // si une demande Ã©tait en attente.
    document.addEventListener("grepoplus:langReady", function _onFirstLang() {
        _langReady = true;
        document.removeEventListener("grepoplus:langReady", _onFirstLang);
        if (_pendingStart && !_tutorialCancelled && !tutorial.active) {
            _pendingStart = false;
            ctx("debug", "Tutoriel \u2014 langue pr\u00eate, d\u00e9marrage.");
            tutorial.start();
        }
    });

    tutorial.maybeStart = function() {
        if (isTutorialDone()) {
            _tutorialCancelled = true;
            if (tutorial.active) tutorial.stop();
            ctx("debug", "Tutoriel d\u00e9j\u00e0 fait (confirm\u00e9 serveur), annul\u00e9.");
        } else {
            if (!tutorial.active && !_tutorialCancelled) {
                ctx("debug", "Tutoriel non fait (confirm\u00e9 serveur) \u2014 d\u00e9marrage.");
                _startWhenReady();
            }
        }
    };

    setTimeout(function() {
        if (!_tutorialCancelled && !tutorial.active) {
            ctx("debug", "Tutoriel \u2014 d\u00e9marrage optimiste (attend la langue).");
            _startWhenReady();
        }
    }, 3000);

    d.tutorial = tutorial;

})(this);
