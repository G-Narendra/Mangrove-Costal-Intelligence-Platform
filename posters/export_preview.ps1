$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = 1
try {
    $pres = $ppt.Presentations.Open('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\MCIP_Poster.pptx', [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse)
    $slide = $pres.Slides.Item(1)
    $slide.Export('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\preview.png', 'PNG', 3200, 3200)
    $slide.Export('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\pdf_pages\poster_preview.png', 'PNG', 3200, 3200)
    Write-Host "Done: Exported 3200x3200 preview.png successfully"
    
    # Export to PDF (32 = ppSaveAsPDF)
    $pres.SaveAs('C:\Users\naren\Desktop\unicorn\mangrove\posters\ppt\MCIP_Poster.pdf', 32)
    Write-Host "Done: Exported MCIP_Poster.pdf successfully"
    $pres.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)"
} finally {
    $ppt.Quit()
}
