const fileInput = document.querySelector("input[type=file]");
const output = document.querySelector(".output")

fileInput.addEventListener("change", ()=>{
  const [file] = fileInput.files 
  if (file){
    const reader = new FileReader();
    reader.addEventListener("load", ()=>{
      output.innerText = reader.result

    })
    reader.readAsText(file)
  }
})