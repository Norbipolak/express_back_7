import express from "express";
import expressEjsLayouts from "express-ejs-layouts";
import UserHandler from "./app/userHandler,js"; 
import session from "express-session"
import successHTTP from "./app/successHTTP.js";
import Addresses from "./app/Addresses.js";

const app = express();

app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.use(urlencoded({extended: true}));
app.use(express.static("assets"));

app.use(session());

app.use(session({
    secret: "asdf",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24*60*60*1000
    }
}));

const uh = new UserHandler();
const p = new Profile(); 
const a = new Addresses();

app.get("/", (req, res)=> {
    res.render("public/index", {layout: "layouts/public_layout", title: "Kezdőlap", page:"index"});
});

app.post("/regisztracio", async (req, res)=> {
    let response;
    try {
        response = await uh.register(req.body); 
    } catch (err) {
        response = err;
    }

    //response.success = response.status.toString(0) === "2";
    response.success = successHTTP(response.status);
    res.status(response.status);

    res.render("public/register_post", {
        layout: "./layout/public_layout",
        message: response.message,
        title: "Regisztráció",
        page: "regisztracio", 
        success: response.success
    })
});

app.post("/login", async (req, res)=> {
    let response;

    try{
        response = uh.login(req.body);
        req.session.userName = response.userName;
        req.session.userID = response.userID;
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? "/profil" : `/bejelentkezes?message=${response.message[0]}`
    )

})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : ""
    })
});

app.get("/profil", async (req, res)=> {
    try {
        const profileData = await p.getProfile(req.session.userID);
        const messages = req.query.messages.split(",");
        /*
            Mert a getProfile függvény vár egy id-t és az alapján lehozza az összes (*) adatot, ahhoz az id-ű rekordhoz 
        */
        res.render("private/profile", {
            layout: "./layouts/private_layout",
            title: "Profil Szerkesztése",
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            messages: req.query.message ? req.query.message.split(",") : [],
            success: req.query.success ? req.query.success === "true": true
        })
    } catch(err) {
        res.redirect("/");
    }   
});

app.post("/profil", async (req, res)=> {
    let response;

    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);
    } catch(err) {
        response = err;
    }

    console.log(response);

        
    const success = successHTTP(response.status);
    res.redirect(`/profil?success=${success}&messages=${response.message}`);
});

app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    console.log(req.session.userID);

    res.render("user/addresses", {
        layout: "./layouts/private_layout", 
        title: "Címek létrehozása", 
        page: "címek",
        addressTypes: addressTypes
    })
})

app.listen(3000, console.log("the app is listening on localhost:3000"));

/*
    app.post("/profil", async (req, res)=> {
    let response;

    try {
        response = await p.updateProfile(req.body);
        } catch(err) {
            response = err;
        }

Itt gondolkodtunk azon, hogy itt is render-eljük-e a profil-t 
-> 
        res.render("profile", {
            layout: "./layouts/private_layout",
            title: "Profil Szerkesztése",
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil"
        })

És akkor itt lesz egy errors vagy messages nevű mező vagy itt visszaírányítunk valahova, ezt fogjuk most csinálni!!! 

Tehát csinálunk egy ilyet, hogy res.send("/profil")

Csinálunk egy successHTTP funcion-t ennek -> response.success = response.status.toString()[0] === "2"
mert ezt többször is fel kell majd használni meg használtuk is és akkor majd csak meghívjuk a successHTTP függvényt 
de fontos, hogy ezt majd be is kell hívni/import, hogy elérjük 
response.success = response.status.toString(0) === "2";
->
response.success = successHTTP(response.status);

és akkor itt is ugyanez amit most csinálunk, annál is kell egy response.success vagy itt const response lesz, mert be akarjuk helyetesíteni
->
    const success = successHTTP(response.status);
    res.redirect(`/profil?success=${success}&messages=${response.message}`);

Az a kérdés, hogy a response.message majd, hogy adja vissza a dolgokat, mert ez egy tömb a message és azt rakjuk be az URL változóba!! 
De ha itt azt, mondjuk, hogy console.log(req.query)
->
app.get("/profil", async (req, res)=> {
    try {
        const profileData = await p.getProfile(req.session.userID);
        console.log(req.query);
        ...
***
Az a lényeg, hogy itt csak POST kérés létezik és nincsen PUT, szóval csak GET és POST kérést csinálunk itt!!! 
Meg az volt a gond, hogyha itt valami változtatást csinálunk és elmentjük, akkor ki fog lépni és nekünk újra be kell jelentkeznünk 
Ezért, hogy ez gyorsabban menjen és ne kelljen mindig beírni az email-t meg a pass-t, ezért ott egy value-val megadjuk neki az értéket 
és akkor automatikusan mindig az lesz kiírva!!! 
->
    <h3>Email cím</h3>
    <input name="email" type="text" value="tompika96@gmail.com">  **value

    <h3>Jelszó</h3>
    <input name="pass" type="password" value="asdfasdf">
****
{
    success: 'true',
    message: 'A keresztnevnek legalább 4 karakteresnek kell lennie!, A vezetéknévnek legalább 4 karakteresnek kell lennie!'
}
Tehát ha nem írunk be semmit a lastName meg a firstName-re, akkor ezt a message-t fogjuk majd kapni
ahol toString-eli és vesszővel van elválasztva, de ez nem olyan nagy probléma, mert -> const messages = req.query.messages.split(",");
-> 
app.get("/profil", async (req, res)=> {
    try {
        const profileData = await p.getProfile(req.session.userID);
        const messages = req.query.messages.split(",");

És ha megcsináltuk ezt a const messages-t, akkor ezt megadjuk, amikor render-eli az oldalt -> messages: messages
->
        res.render("profile", {
            layout: "./layouts/private_layout",
            title: "Profil Szerkesztése",
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messages

És így adjuk át a hibaüzeneteket, hogy a post-nál visszakapunk egy response, amiben van egy olyan, hogy status meg message 
A status arra csináltunk egy segédfüggvényt -> successHTTP az lesz itt a success -> const success = successHTTP(response.status) 
    ez egy boolean érték lesz majd 
res.redirect(`/profil?success=${success}&messages=${response.message}`);
És itt van még a message, ami egy tömb és elérhető majd a query-ből (meg a success is)!!!!!
Azért amikor van a get-es kérés a profil-nak, akkor ott van egy olyan, hogy req.query és ezt kell majd split-elni ,-ként 
->
const messages = req.query.messages.split(",");
Majd átadni messages-nek amikor render-eljük az oldalt, hogy ezek a messagek majd tényleg ki legyenek írva az oldalra 

De ezt lehet úgy is csinálni, hogy nem mentjük el ezt -> const messages = req.query.messages.split(",");
Hanem rögtö be tudunk helyetesíteni ide 
->
messages: req.query.message ? req.query.message.split(",") : []
És így az a jó, hogy mindig van valami a messages-ben vagy split-elve, amit visszakapunk a req.query.message-ból vagy egy üres tömb 
Ezen végig tudunk majd menni a profile.ejs-en és meg tudjuk jeleníteni őket!!! 

Van egy success, hogy müködött-e a dolog 
    message: req.query.message ? req.query.message.split(",") : [],
    success: req.query.success ? req.query.success === "true": true

És ami nagyon, fontos, hogy azért kell így megvizsgálni, hogy létezik-e, hogy req.query.., mert csak akkor létezik, hogyha beírtuk az adatokat 
és csinálunk egy redirect-vel a /profil-ra ahol az url-ben lesz még a success meg a response.message, de ha elöször megyünk a /profil oldalra,
akkor nem lesznek ezek a dolgok benne az URL-ben és a res.query.success meg message az nem fog létezni, mert csak annyi lesz, hogy /profil 
és azért kell ezt render-nél megvizsgálni, mert ha létezik a req.query.success, akkor biztos, hogy már át lettünk írányítva a post kérés-ből 
ide a /profil-ra és van az url-ben success... 
és ezeket csak akkor írjuk ki ha léteznek!!! 
success: req.query.success ? req.query.success === "true": true
-> 
req.query.success az csak egy string lehet, ezért megnézzük, hogy egyenlő-e, azzal, hogy string true ("true") 
Ettől függően lesz true vagy false, egyébként meg mindig true!!!!!!!!!!!!

És ez lesz majd a profile.ejs-en, amit majd megjelenítünk a render-vel a profil oldalunkon 
->
    <% message.forEach((m)=> {%>
        <h4 class="<%=success ? 'color-success' : 'color-error'%>">
            <%=m%>
        </h4>
    <% }); %>

Tehét végigmegyünk a message-n, amit megadunk a render-nél paraméterként és itt lesznek majd a req.query.message-ből megszerzett dolgok 
amikket split(",")-elünk majd, tehát egy tömbbe lesznek 
Végigmegyünk rajta egy forEach-vel és ami még fontos az class-ban található a success 
Azért kell átadni a success-t, mert ez alapján fogjuk majd meghatározni, hogy milyen osztályt adunk neki color-success vagy color-error 

Ha kitöljük ami a profile.ejs-en van dolgokat, hogy firstName, lastName, akkor azt vissza tudjuk majd kapni a post-os kérésnél a req.body-ban 
amit majd ugye átadunk a Profile.js-ben lévő p.updateProfile-nak, hogy ellenőrizze a dolgokat 
req.body 
{
    userName: 'tompika96@',
    email: 'tompika96@gmail.com',
    lastName: 'Kiss',
    firstName: 'Tompika'
}

Kaptunk egy hibaüzenetet Profile.updateProfile: { status: 404, message: ['A felhasználói profil nem található!']}
Ez azért van mert itt megadtuk a req.body-t az p.updateProfile-nak 
-> response = await p.updateProfile(req.body);
De ez az egész update-s kérés az vár még egy ID-t is profile.userID
->
    const response = await conn.promise().query(`
        UPDATE users SET userName = ?, email = ?, firstName = ?, lastName = ?
        WHERE userID = ?`,
        [profile.userName.trim(), profile.email.trim(), 
        profile.firstName.trim(), profile.lastName.trim(),
        profile.userID]
Amit a req.body-ban nem tudunk visszaadni neki, mert ezt a userID-t a session-be tároljuk és a req.body-ban nincsen meg!!!!!!!!!!!!!!!!!!
A userID nélkül meg nem tudunk update-lni, mert az mondja majd meg, hogy melyiket kell update-elni
req.session.userID !!!!!!!!!!!!!!!!!!!!!
app.post("/profil", async (req, res)=> {
    let response;
    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);

Ezt így is meg lehet csinálni, hogy egy változóba user lementjük a req-body-t 
->
const user = req.body;
és mivel ez egy objektum, ezért meg tudunk adni neki egy kulcsot valamilyen értékkel 
user.userID = req.session.userID;
csináltunk neki egy userID kulcsot és megadtuk neki a req.session.userID-t 
és így már egy objektukmban van az összes adat ami kell és ezt adjuk majd át a p.updateProfile-nak -> response = await p.updateProfile(user);

Így már ha beírtuk az adatokat és rányumtunk a mentés gombra, akkor kiírja, hogy sikeres mentés és ott marad ezen az oldalon és az adatok 
is ott lesznek az input mezőkben és akkor így már az adatbázisban is megtalálható lesz 

Megcsináljuk a címeket
Kell egy olyan, hogy user és public mappa a views-ba 
És ami a publikus felületen van az bemegy a public-ba (home.ejs, register.ejs stb.. ) ami meg a user az meg a user-be (profile.ejs stb..)
Ami meg azért lesz kicsit baj, mert így át kell majd írni az elérési útvonalakat 
->
app.get("/", (req, res)=> {
    res.render("index", {layout: "layouts/public_layout", title: "Kezdőlap", page:"index"});
});

tehát amikor a "/" oldalon vagyunk, akkor nem az index-et render-eljük hanem a public/index-et 
és ezt így meg kell csinálni a többinél is, hogy eléírjuk, hogy user vagy public (attól függően, hogy melyik mappában van a file)
->
res.render("public/index"
res.render("user/profile"..

Mert majd lesz egy olyan mappa is, hogy admin, attól függően, hogy adminok vagyunk-e!!! 

Most ezt fogjuk megcsinálni, hogy "/címek"          
    <li class="<%=page === 'címek' ? 'selected-menu' : '' %>">
        <a href="/címek">Címek</a>
    </li>

és erre csinálunk egy olyat, hogy address.ejs a user-ben, amit majd meg fogunk jeleníteni!! 
Lemásoljuk majd a profile.ejs-t és majd átalakítjuk, mert ez is egy post kérés lesz, itt is lesznek majd hibaüzenetek message stb. 
    <form class="box" method="POST" action="/címek">
csak majd az action lesz más, mert itt nem a /profil-ra fogunk átírányítani!! 
Megnézzük, hogy az sql-en milyen mezőink vannak és majd aszerint fogjuk megcsinálni a post kérést, hogy milyen adatok-ra van szükség 
Elöször is le kénne, majd hozni az addressType-ot, mert ez egy másik táblához van összekapcsolva 
itt csak az lesz erre, hogy 1-2-3 és majd a másik táblán lesz kapcsoljuk hozzá, hogy 1 vagy 2 vagy 3 mit jelent 
számlázási cím, szállítási cím stb.. 
types_addresses táblán meg ilyen mezők vannak, hogy typeID és typeName 
itt megcsináljuk, hogy milyen typeName-k lehetnek (rekordok)
-> 
számlázási, szállítási, számlázási és szállítási
->
INSERT INTO types_addresses ('typeID', 'typeName') VALUES (NULL, 'számlázási'), (NULL, 'szállítási'), (NULL, 'számlázási és szállítási')
-> 
typeID    typeName
  1      számlázási
  2      szállítási
  3      számlázási és szállítási

Erre csinálunk egy új class-t -> Addresses.js
meg csináltunk egy addresses.ejs-t is 

És az egészben még az a rossz, hogy ezt is csak, akkor tudjuk szerkeszteni, ha be vagyunk jelentkezve 
app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    console.log(req.session.userID);

Ha ez a req.session.userID az undefined, akkor ki kell innen jelentkeztetni!!! 
Viszont ha be vagyunk jelentkezve, akkor nem undefined lesz, hanem 6-os (mert pont az a userID-ja amivel bejelentkeztünk)!!!! 
*/


