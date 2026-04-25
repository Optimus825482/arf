$urls = @{
    "splash.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2I1ZTVlMWJkODk0NDQ3NjI5OGNhZGE3OTIzNTM0ZGY4EgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=89354086";
    "gozcu.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzNiMjJjNDdlYzVmYTQ1YzVhZGU5ZjRhOTVlYzc2MzQxEgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=96797242";
    "kayit1.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzYwNWM2NGJmZjI2ZTQyN2NhNTQ2NzNjNGIxY2M4M2Y3EgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=96797242";
    "murettebat.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzQ0ZTJhM2ZiYTcyMjRjNTZhMGI0N2QxZmM1NmM1Y2E3EgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=96797242";
    "kayit2.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2NhZGQ0NDA1NTdmMzRkNWE5YjM4NzIwN2I3MzAxMjhhEgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=96797242";
    "pratik.html" = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzUxOTMwOTE4NmM3NzQ5YzliNjJjMmFjMzAzNzgxMmE0EgsSBxD_7NPwvB8YAZIBIwoKcHJvamVjdF9pZBIVQhM3MjMxMjI2NDA4MTc3MjQzNDQ5&filename=&opi=96797242"
}
mkdir "d:\arf\stitch-screens" -Force
foreach ($k in $urls.Keys) {
    Invoke-WebRequest -Uri $urls[$k] -OutFile "d:\arf\stitch-screens\$k"
}
