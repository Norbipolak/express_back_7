import conn from "./conn.js";
import nullOrUndefined from "./nullOrUndefined.js";

class Addresses {
    checkData(address) {
        const errors = [];
        const postalCode = parseInt(address.postalCode);

        if (nullOrUndefined(address.addressType)
            || address.addressType == 0) {
            errors.push("Nem választottál ki cím típust");
        }

        if (nullOrUndefined(address.postalCode)
            || isNaN(postalCode) && postalCode < 1000 || postalCode > 9000) {
            errors.push("A írányítószám formátuma nem megfelelő!");
        }

        if (nullOrUndefined(address.settlement) || address.settlement.length < 3) {
            errors.push("A települést kötelező kitölteni!");
        }

        if (nullOrUndefined(address.street) || address.street.length < 5) {
            errors.push("Az utcát kötelező kitölteni!");
        }

        if (nullOrUndefined(address.houseNumber) || address.houseNumber.length < 1) {
            errors.push("A házszámot kötelező kitölteni!");
        }

        return errors;
    }

    async createAddress(address, userID) {
        const errors = this.checkData(address);

        if (errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }
        }


        try {
            const response = await conn.promise().query(`
            INSERT INTO addresses(addressType, userID, postalCode, settlement, street, houseNumber, floorNumber, doorNumber)
            VALUES(?,?,?,?,?,?,?,?)`
            [address.addressType, userID, address.postalCode, address.settlement,
            address.street, address.houseNumber, address.floorNumber, address.doorNumber
            ]
            );

            if (response[0].affectedRows === 1) {
                return {
                    status: 200,
                    message: ["Sikeres létrehozás"],
                    insertID: response[0].insertId
                }
            } else {
                throw {
                    status: 503,
                    message: ["A bejegyzés nem lett létrehozva, mert a szolgáltatás ideglenes nem üzemel!"]
                }
            }

        } catch (err) {
            console.log("Addresses.createAddress: ", err);

            if (err.status) {
                throw err;
            }
            throw {
                status: 503,
                message: ["A profil mentése szolgáltatás jelenleg nem elérhető!"]
            }
        }
    }

    async getAddressTypes() {
        const response = await conn.promise().query(`select * from types_addresses`);
        return response[0];
    }

}

export default Addresses;

/*
    Milyen függvények lesznek itt checkData az biztos kell, mert ha egy post kérés van, akkor le kell ellenőrizni, hogy a felhasználó jól tölötte
    ki az input mezőket 
    ->
    class Addresses {
    checkData(address) {

    }
    Milyen mezők vannak az addresses táblán 
    1. addressID - ez auto_increment 
    2. addressType ez ki fogja majd választani a felhasználó select - option-ös dolog 
    3. userID - ez a session-ből kapjuk majd meg, ott van eltárolva - ezt a felhasználó nem fogja majd tudni szerkeszteni 
        mert ugy be tudna rakni egy másiknak a profile-jába egy szállítási címet mondjuk! 
    4... PostalCode, settlement, street, houseNumber, floorNumber, doorNumber - ezeket kell majd kitöltenie 

    AddressType-ra csinálunk egy legördülő listát, aminek az első elemének az lesz a value-ja, hogy 0, és hogyha ez 0, akkor nem 
    választott ki semmit, most le lehetnek azt ellőrizni, hogy létezik olyan ID types_addresses-ben 4-es ID, hogyha 4-est küld be 
    de ezt még itt mi nem fogjuk leellenőrizni 
    -> 
    checkData(address) {
        const errors = [];

        if(nullOrUndefined(address.addressType)
        || address.addressType == 0) {
            errors.push("Nem választottál ki cím típust")
        }

És akkor így az összes dolognak, amit majd bekérünk csinálunk egy hibaüzenetet, amit majd push-olunk az errors-ba  
Ami még fontos, hogy ez itt == nem === 
address.addressType == 0 mert, amit majd visszakapunk itt az egy string 0 -> "0" és egy number 0-val hasonlítjuk össze 
    nem kell ===, mert akkor a type-ját is megnézné és minden esetben false lenne és nem írnánk hibaüzenetet 

Postal Code -> mi csak azt nézzük meg, hogy 1000 - 9000-ig lehet, most ennél komolyabb ellenőrzést nem csinálunk, de létezik olyan api 
amiből meg tudjuk nézni, hogy valódi cím vagy nem 
fejlesztendo_and_API!!!!! 

Itt az az érdekes, hogy ennek egy számnak kell lennie, meg kellene nézni, hogy NaN()-e, de ezt majd csak azután tudjuk megnézni, hogy megpróbáltuk 
számmá változtatni, mert ez egy string lesz (mert egy form-ból kapjuk majd meg)!!!! 
-> 
erre csinálunk egy nan.js-t!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
-> 
function nan(num) {
    return isNaN(parseInt(num))
}

de ezt meg lehet csinálni ilyen formában nan nélkül 
->
    checkData(address) {
        const errors = [];
        const postalCode = parseInt(address.postalCode); !!!!

        ...

        if(nullOrUndefined(address.postalCode)
        || isNaN(postalCode) !!!! && postalCode < 1000 || postalCode > 9000)

**********

        if(nullOrUndefined(address.postalCode)
        || isNaN(postalCode) && postalCode < 1000 || postalCode > 9000) {
            errors.push("A írányítószám formátuma nem megfelelő!")
        }

Úgy érdemes megnézni, hogy egyáltalán meg van-e -> (nullOrUndefined(address.postalCode)
utána a formátuma -> isNaN(postalCode)
és utána az érték -> postalCode < 1000 || postalCode > 9000

Mert így biztos, hogy nem kapunk olyan hibakódot, hogy can not read of properties undefined/of null
mert akkor próbálnánk olyan müveletet végezni a null-ra/undefined-re amit nem lehet (pl. ilyen volt a length)
Ezért csekkoljuk, hogy valami gond van-e és akkor utána, mindig haladunk beljebb 

function nullOrUndefined(data) {
    return data === null || data === undefined || data.length === 0;
}

itt a data.length === 0 a végn nem biztos, hogy mindig kell, mert mi van ha van egy nem kötelező mező 
->
function nullOrUndefined(data) {
    return data === null || data === undefined 
}
****
if(nullOrUndefined(address.street) || address.street.length < 5) {
    ..
}

itt a street-nél azt is lehet csinálni, hogy ne tú-nak írja az út-at, hogy van egy select, ahol ki lehet választani, hogy út, tér stb.
és az input-ba már csak a nevét írja be 

address.street.length < 5
itt meg ez, hogy vi út annak a length-je 5 lesz, mert benne van az út meg a space is! 

houseNumber-t jó úgy meghatározni az sql-ben, hogy varchar(55), mert léteznek ilyenek, hogy 11/b stb..

A floor meg a doorNumber azok nem kötelezőek, ha nem nullOrUndefined és akkor itt a feltételeket nem || vagy hanem && és-vel választjuk el!! 
if(!nullOrUndefined(address.floorNumber) && address.floorNumber )
Jelen esetben az a kérdés, hogy itt mit tudunk leellenőrizni, hogy egy number-e, de akkor ez nem is lesz itt benne vagy kitölti vagy nem 

és visszaadjuk ezt az errors tömböt -> return errors;
*****
Google place API -> fejlesztendo_and_API.js a places-en bizonyos lekérdezés ingyenes havonta de ha túllépjük akkor drága 
van egy másik a tomtom, itt is sok API van, ahol tudjuk csekkolni, hogy létezik-e a cím, meg van cím auto-complete, hogy elkezdjük beírni 
és megjelenik egy listában, egy hasonló, amit beírtunk 
ezek ilyen API hívások, ezek nem ingyenesek, naponta vagy havonta egy bizonyos számú API call-t engedélyez
***** 
createAddress(address, userID) {
Csináltunk egy createAddress, ahol majd bekérjük egy address objektumot és egy userID-t is 
itt az sql-en ugye van egy userID is!!!! 
És itt le is tudjuk/kell ellenőrizni, hogy az adott user létezik-e, mert mi van ha nem létező user-nek rakjuk be ezeket 
de most feltételezzük, hogy létezik, de normál rendszerekben egy kicsit komolyabb felhasználóazonosítás megy végbe, mint itt 
***
async createAddress(address, userID) {
        const errors = this.checkData(address);

        if(errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }

és ami itt lesz majd a try-catch blokk-ba, azt meg lemásoljuk a Profile.js-ből, mert ezt ott kidolgoztuk 
főleg ami itt van a catch-ben 
->
    } catch(err) {
        console.log("Addresses.createAddress: ", err);

        if(err.status) {
            throw err;
        }
        throw {
            status: 503,
            message: ["A profil mentése szolgáltatás jelenleg nem elérhető!"]
        }
    }

És ami itt érdekes, hogy amikor regisztrálunk, akkor a users-ben megtalálhatóak az adataink, de nincsen egyetlen egy address sem 
Ez azért fontos számunkra, mert amikor elöször töltjük ki az addresses-t (az első címünket), akkor létre kell hozni a bejegyzést 
de amikor már meg van utána felülírni!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

Tehát itt elöször le kell csekkolni, hogy létezik-e
Lesz egy külön create meg egy updateAddress is!!! 

itt amit be kell hívni az a conn és vigyázni kell, hogy .js-es végződés ott legyen!!! 
    meg az összesnél ami be van ide hívva függvény 
import conn from "./conn.js";
import nullOrUndefined from "./nullOrUndefined.js";

const response = await conn.promise().query(`
    INSERT INTO addresses(addressType, userID, postalCode, settlement, street, houseNumber, floorNumber, doorNumber)
    VALUES(?,?,?,?,?,?,?,?)`
    [address.addressType, userID, address.postalCode, address.settlement, 
    address.street, address.houseNumber, address.floorNumber, address.doorNumber
]
Itt fontos, hogy a userID-t azt nem az address obejktumból fogjuk majd megkapni hanem a session-ből, tehát nem kell elé address.
utána meg ez: 

        if(response[0].affectedRows === 1) {
            return {
                status: 200,
                message: ["Sikeres létrehozás"]
            }
        } else {
            throw {
                status: 503,
                message: ["A bejegyzés nem lett létrehozva, mert a szolgáltatás ideglenes nem üzemel!"]
            }
        } 

Annak az esélye, hogy itt 503-as hibakód-ot dobunk az nem túl valószínű, mert ha eddig lefutott, akkor mi oka lenne az adatbázisszervernek 
ha elérhető nem bejegyezni!!!!!! 

Most megcsináljuk a addresses.ejs-t 
Ott majd nem lesznek value-k, mert azok majd csak a felülírásnál lesznek, amikor már egyszer ki volt töltve és meg akarjuk jeleníteni az 
értéküket, value-t 
-> 
        <h3>Email cím</h3>
        <input type="text" name="email"
        value="<%=profileData.email%>">   **

Hogy fogjuk majd megoldani az update-t
Itt vissza kell adni egy olyat, hogy insertID, azért mert amikor létrehozunk egy address-t, mert akkor utána átírányítunk egy olyanra, hogy 
address/id és az újonnan létrehozott address-nek az id-ja 
Miért 
->
Azért, mert ez egy másik route lesz és a másik route-on már update-elni fogunk és az update-t fogjuk meghívni, nem pedig a create-t 
Tehát majdnem ugyanaz lesz a két URL, csak az egyik az simán address, a másik meg address/1 vagy 2 vagy amelyik id-ról van szó itt!!! 
At insertID-t meg innen kapjuk meg, hogy insertId 
->
    if(response[0].affectedRows === 1) {
        return {
            status: 200,
            message: ["Sikeres létrehozás"],
            insertID: response[0].insertId  ** 

insertId ez lesz majd amit az adatbázisból visszakapunk, az új bejegyzésnek az azonosítója!!! 
    ami ugyanott van ahol az affectedRows (ugyanabban az objektumba kapjuk vissza)!! 

Erre kell majd létrehozni egy get és egy post-os endpoint-ot!!! index.js 
****
addresses.ejs
-> 
        <h3>Cím típusa</h3>
        <select name="addressType">
            <option value="0">Válassz típust</option>
        </select>

Erre kell egy getAddressTypes, hogy majd meg tudjuk jeleníteni, hogy milyen option-ök közül lehet majd itt választani!!!! 
    async getAddressTypes() {
        const response = await conn.promise().query(`select * from types_addresses`);
        return response[0];

és akkor itt visszaaduk és majd render-ben csinálunk egy addressTypes kulcsot, ami az lesz amit visszaad ez a függvény
és fontos, hogy emiatt ott a függvény async kell, hogy legyen, meg hogy be legyen hívva ez a class az index.js-en 
->
const a = new Addresses();

console.log(addressTypes)
->
{ typeID: 1, typeName: 'számlázási'},
{ typeID: 2, typeName: 'szálítási'},
{ typeID: 2, typeName: 'számlázási és szállítási'}

->
app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    console.log(addressTypes);

    res.render("user/addresses", {
        layout: "./layouts/private_layout", 
        title: "Címek létrehozása", 
        page: "címek",
        addressTypes: addressTypes  //lehoztuk egy select-vel sql-ből és egy return-vel visszadtuk ami lejött 
            itt behívtuk -> const addressTypes = await a.getAddressTypes(); és átadtuk a render-be!!!!!! 
    })

address.ejs 
Végigmegyünk egy forEach-vel, megadjuk a value-nak a typeID és typeName, ami meg ki lesz írva!!!!  

        <select name="addressType">
            <option value="0">Válassz típust</option> 
            <% addressTypes.forEach((a)=> { %>
                <option value="<%= a.typeID %>"><%= a.typeName %></option>
            <% }) >% 
        </select>

És akkor így megjelenik majd a select-ben 
    <option value="0">Válassz típust!</option>
    <option value="1">számlázási</option>
    <option value="2">szállítási</option>
    <option value="3">számlázási és szállítási</option>

    <div class="container text-center"></div>
    <form class="box" method="POST" action="/addresses">
        <h3>Cím típusa</h3>
        <select name="addressType">
            <option value="0">Válassz típust</option> 
            <% addressTypes.forEach((a)=> { %>
                <option value="<%= a.typeID %>"><%= a.typeName %></option>
            <% }) >% 
        </select>

        <h3>Írányítószám</h3>
        <input type="text" name="postalCode">

        <h3>Település</h3>
        <input type="text" name="settlement">

        <h3>Közterület neve és jellege</h3>
        <input type="text" name="street">

        <h3>Házszám</h3>
        <input type="text" name="houseNumber">

        <h3>Emelet</h3>
        <input type="text" name="floorNumber">

        <h3>Ajtó</h3>
        <input type="text" name="doorNumber">

        <button>Mentés</button>
    </form>
</div>
*/