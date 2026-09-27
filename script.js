let mods = [];


fetch("mods.json")
.then(response => response.json())
.then(data => {

    mods = data.mods;

    displayMods(mods);

});


function displayMods(list) {

    const container = document.getElementById("mods");

    container.innerHTML = "";


    if(list.length === 0){

        container.innerHTML =
        "<p>No mods found.</p>";

        return;

    }


    list.forEach(mod => {


        container.innerHTML += `

        <div class="mod-card">

            <h3>${mod.name}</h3>

            <p class="tag">
            Type: ${mod.type}<br>
            Version: ${mod.version}<br>
            Creator: ${mod.author}
            </p>


            <a class="download"
            href="${mod.download}">
            Download
            </a>

        </div>

        `;


    });

}



document.getElementById("search")
.addEventListener("input", filterMods);



document.getElementById("category")
.addEventListener("change", filterMods);



function filterMods(){

    let search =
    document.getElementById("search").value.toLowerCase();


    let category =
    document.getElementById("category").value;


    let filtered =
    mods.filter(mod => {


        let matchesName =
        mod.name.toLowerCase()
        .includes(search);


        let matchesCategory =
        category === "All" ||
        mod.type === category;


        return matchesName &&
        matchesCategory;


    });


    displayMods(filtered);

}
