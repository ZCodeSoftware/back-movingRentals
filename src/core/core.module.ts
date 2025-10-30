import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventEmitterModule } from "@nestjs/event-emitter";
import config from "../config/";

@Module({
    imports: [
        MongooseModule.forRoot(config().mongo.mongo_uri),
        EventEmitterModule.forRoot()
    ],
    controllers: [],
    providers: [],
    exports: [MongooseModule]
})

export class CoreModule { }