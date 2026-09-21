$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = 1
try {
    $pres = $ppt.Presentations.Open('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\MCIP_Poster.pptx', [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    $slide = $pres.Slides.Item(1)
    $slide.Export('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\preview.png', 'PNG', 3000, 3000)
    Write-Host "Done: Exported 3000x3000 preview.png successfully"
    $pres.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    $ppt.Quit()
}
